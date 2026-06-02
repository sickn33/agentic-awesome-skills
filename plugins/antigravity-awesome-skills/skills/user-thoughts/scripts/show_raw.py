"""user-thoughts raw — 显示未处理的 raw 文件。

用法:
    python show_raw.py [--help]

显示 #raw/ 目录下未处理的 raw 文件及其条目。
"""
import sys
from pathlib import Path

from common import find_ustht, is_processed

HELP = """用法: python show_raw.py [--help]

显示 #raw/ 目录下未处理的 raw 文件及其条目。

输出: 每个未处理文件的文件名、条目数和具体内容。
若所有文件已处理或无 raw 文件，输出相应提示。"""


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(HELP)
        sys.exit(0)

    ustht = find_ustht()
    if ustht is None:
        print("错误：未找到 .ustht/ 目录。请先执行 /ustht init 初始化。")
        sys.exit(1)

    raw_dir = ustht / "raw"
    if not raw_dir.exists():
        print("无未处理记录。")
        sys.exit(0)

    files = sorted(raw_dir.glob("*.md"), reverse=True)
    unprocessed = [f for f in files if not is_processed(f)]

    if not unprocessed:
        print("无未处理记录。所有 raw 文件已标记为 processed。")
        sys.exit(0)

    for f in unprocessed:
        lines = f.read_text(encoding="utf-8").splitlines()
        entry_count = sum(1 for l in lines if l.strip().startswith("- ["))
        print(f"#{f.name}（未处理 {entry_count} 条）：")
        for line in lines:
            if line.strip().startswith("- ["):
                print(f"  {line}")
        print()


if __name__ == "__main__":
    main()
