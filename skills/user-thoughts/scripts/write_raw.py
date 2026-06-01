"""user-thoughts write_raw — 写入一条想法到当天 raw 文件。

用法:
    python write_raw.py "想法内容" [--dim 维度名] [--help]

即时计划调用此脚本记录用户想法。
"""
import sys
import re
from datetime import datetime
from pathlib import Path

from common import find_ustht, read_define_ini, validate_dim_name

HELP = """用法: python write_raw.py "想法内容" [--dim 维度名] [--help]

将一条想法写入 #raw/ 当天日期文件。

参数:
  "想法内容"     要记录的想法文本（必需）
  --dim 维度名   预判维度（可选），如 rules、ui/outline
  --help         显示此帮助信息

维度名规则: 仅允许小写字母、数字、连字符，支持子目录（如 ui/outline）。

行为:
  - 若当天文件已标记 processed，自动创建带序号的新文件（如 2026-06-01-2.md）
  - 单日条目超过 5 条时，建议执行 /ustht sortin
  - SKILL_STATUS=off 时输出提示并退出"""


def count_today_raw(raw_dir: Path) -> int:
    """统计当天所有未处理 raw 文件的条目数（含带序号的文件）。"""
    today = datetime.now().strftime("%Y-%m-%d")
    count = 0
    for f in sorted(raw_dir.glob(f"{today}*.md")):
        content = f.read_text(encoding="utf-8")
        first_line = content.split("\n", 1)[0].strip()
        if first_line == "<!-- processed -->":
            continue
        count += sum(1 for l in content.splitlines() if l.strip().startswith("- ["))
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
    if cfg.get("SKILL_STATUS") == "off":
        print("SKILL 已关闭，操作已忽略。")
        sys.exit(0)

    # 解析参数
    thought = None
    dim = None
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--dim" and i + 1 < len(args):
            dim = args[i + 1]
            i += 2
        elif thought is None:
            thought = args[i]
            i += 1
        else:
            i += 1

    if not thought:
        print("错误：缺少想法内容参数。")
        print(f"用法: {sys.argv[0]} \"想法内容\" [--dim 维度名]")
        sys.exit(1)

    # 验证维度名
    if dim and not validate_dim_name(dim):
        print(f"维度名非法：{dim}。仅允许小写字母、数字和连字符，支持子目录。")
        sys.exit(1)

    raw_dir = ustht / "raw"
    raw_dir.mkdir(exist_ok=True)

    today = datetime.now().strftime("%Y-%m-%d")
    now = datetime.now().strftime("%H:%M")
    raw_file = raw_dir / f"{today}.md"

    # 如果当天文件已 processed，创建带序号的新文件
    if raw_file.exists():
        first_line = raw_file.read_text(encoding="utf-8").split("\n", 1)[0].strip()
        if first_line == "<!-- processed -->":
            seq = 2
            while (raw_dir / f"{today}-{seq}.md").exists():
                seq += 1
            raw_file = raw_dir / f"{today}-{seq}.md"

    # 构建条目行
    suffix = f" | 待归入:{dim}" if dim else ""
    entry = f"- [{now}] {thought}{suffix}"

    # 追加到文件
    if raw_file.exists():
        content = raw_file.read_text(encoding="utf-8").rstrip()
        raw_file.write_text(f"{content}\n{entry}\n", encoding="utf-8")
    else:
        raw_file.write_text(f"{entry}\n", encoding="utf-8")

    # 检查阈值并建议 sortin
    count = count_today_raw(raw_dir)
    if count > 5:
        print(f"今日已记录 {count} 条想法，建议执行 /ustht sortin 整理到 mdbase。")


if __name__ == "__main__":
    main()
