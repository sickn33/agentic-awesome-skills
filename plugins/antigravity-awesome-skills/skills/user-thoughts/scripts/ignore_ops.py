"""user-thoughts ignore — 忽略操作。

用法:
    python ignore_ops.py show              # 显示被忽略的记录
    python ignore_ops.py remove_last       # 删除最后一条 raw 条目，移入 ignored/
    python ignore_ops.py add_suffix "text" # 添加后缀忽略条目
"""
import re
import sys
from datetime import datetime
from pathlib import Path

from common import find_ustht, is_processed

HELP = """用法: python ignore_ops.py show|remove_last|add_suffix "text" [--help]

管理被忽略的想法条目。

子命令:
  show              列举 #ignored/ 目录下所有被忽略的记录
  remove_last       从 raw 中删除最后一条想法，移入 #ignored/
  add_suffix "text" 添加后缀忽略条目到 #ignored/

示例:
  python ignore_ops.py show
  python ignore_ops.py remove_last
  python ignore_ops.py add_suffix "这条想法不需要记录" """


def get_last_entry(raw_dir: Path) -> tuple[Path | None, int | None, str | None]:
    """查找所有 raw 文件中最后一条条目。

    返回 (文件路径, 行索引, 条目文本) 或 (None, None, None)。
    """
    files = sorted(raw_dir.glob("*.md"), reverse=True)
    for f in files:
        if is_processed(f):
            continue
        lines = f.read_text(encoding="utf-8").splitlines()
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].strip().startswith("- ["):
                return f, i, lines[i].strip()
    return None, None, None


def remove_entry_from_file(filepath: Path, line_index: int):
    """从 raw 文件中删除指定行索引的条目。"""
    lines = filepath.read_text(encoding="utf-8").splitlines()
    if 0 <= line_index < len(lines):
        del lines[line_index]
    filepath.write_text("\n".join(lines) + "\n" if lines else "", encoding="utf-8")


def append_to_ignored(ignored_dir: Path, entry: str, method: str):
    """追加条目到当天的 ignored 文件。"""
    today = datetime.now().strftime("%Y-%m-%d")
    f = ignored_dir / f"{today}.md"
    now = datetime.now().strftime("%H:%M")

    # 清理条目：移除维度后缀
    clean = entry
    if " | 待归入:" in clean:
        clean = clean.rsplit(" | 待归入:", 1)[0]

    line = f"{clean}（{method}）"
    if f.exists():
        content = f.read_text(encoding="utf-8").rstrip()
        f.write_text(f"{content}\n- [{now}] {line}\n", encoding="utf-8")
    else:
        f.write_text(f"- [{now}] {line}\n", encoding="utf-8")


def show_ignored(ignored_dir: Path):
    """显示所有被忽略的记录。"""
    if not ignored_dir.exists():
        print("无被忽略的记录。")
        return

    files = sorted(ignored_dir.glob("*.md"), reverse=True)
    if not files:
        print("无被忽略的记录。")
        return

    for f in files:
        lines = f.read_text(encoding="utf-8").splitlines()
        entries = [l for l in lines if l.strip().startswith("- [")]
        if entries:
            print(f"#{f.name}（{len(entries)} 条）：")
            for line in entries:
                print(f"  {line}")
            print()


def cmd_show(ustht: Path):
    show_ignored(ustht / "ignored")


def cmd_remove_last(ustht: Path):
    raw_dir = ustht / "raw"
    if not raw_dir.exists():
        print("无上一条想法可忽略。")
        return

    f, idx, entry = get_last_entry(raw_dir)
    if f is None:
        print("无上一条想法可忽略。")
        return

    remove_entry_from_file(f, idx)
    append_to_ignored(ustht / "ignored", entry, "--last 忽略")
    # 提取纯文本用于展示
    display = entry
    m = re.match(r"^- \[\d{2}:\d{2}\]\s*(.+)$", entry)
    if m:
        display = m.group(1)
        if " | 待归入:" in display:
            display = display.rsplit(" | 待归入:", 1)[0]
    print(f"已忽略上一条想法：{display}")


def cmd_add_suffix(ustht: Path, text: str):
    append_to_ignored(ustht / "ignored", text, "后缀忽略")


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(HELP)
        sys.exit(0)

    ustht = find_ustht()
    if ustht is None:
        print("错误：未找到 .ustht/ 目录。请先执行 /ustht init 初始化。")
        sys.exit(1)

    if len(sys.argv) < 2:
        print(f"用法: {sys.argv[0]} show|remove_last|add_suffix \"text\"")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "show":
        cmd_show(ustht)
    elif cmd == "remove_last":
        cmd_remove_last(ustht)
    elif cmd == "add_suffix":
        if len(sys.argv) < 3:
            print("错误: add_suffix 需要文本参数。")
            print(f"用法: {sys.argv[0]} add_suffix \"text\"")
            sys.exit(1)
        cmd_add_suffix(ustht, sys.argv[2])
    else:
        print(f"未知命令: {cmd}。可用: show, remove_last, add_suffix")
        print(f"用法: {sys.argv[0]} show|remove_last|add_suffix \"text\"")
        sys.exit(1)


if __name__ == "__main__":
    main()
