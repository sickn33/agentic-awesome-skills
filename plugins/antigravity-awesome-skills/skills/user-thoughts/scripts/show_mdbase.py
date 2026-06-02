"""user-thoughts mdbase show — 显示 mdbase 索引或维度内容。

用法:
    python show_mdbase.py show              # 显示 README.ai.md 索引
    python show_mdbase.py show --all        # 显示所有维度及条目数
    python show_mdbase.py show <维度名>     # 显示指定维度内容
"""
import sys
from pathlib import Path

from common import find_ustht, validate_dim_name

HELP = """用法: python show_mdbase.py show [--all|--维度名] [--help]

显示 mdbase 索引或指定维度内容。

子命令:
  show            显示 README.ai.md 索引
  show --all      列出所有维度及条目数
  show <维度名>   显示指定维度的完整内容

示例:
  python show_mdbase.py show
  python show_mdbase.py show --all
  python show_mdbase.py show rules
  python show_mdbase.py show ui/outline"""


def show_index(mdbase: Path):
    """显示 README.ai.md 索引。"""
    readme = mdbase / "README.ai.md"
    if readme.exists():
        print(readme.read_text(encoding="utf-8"))
    else:
        print("mdbase/README.ai.md 不存在。")


def list_dimensions(details: Path) -> list[str]:
    """列出 details/ 下所有维度名。"""
    dims = []
    if not details.exists():
        return dims
    for f in sorted(details.rglob("*.md")):
        rel = f.relative_to(details)
        dim = str(rel.with_suffix("")).replace("\\", "/")
        dims.append(dim)
    return dims


def show_dimension(mdbase: Path, dim: str):
    """显示指定维度文件内容。

    `dim` 可以是简单名称（如 rules）或子目录路径（如 ui/outline）。
    Path 自动处理 `/` 作为目录分隔符。
    """
    if not validate_dim_name(dim):
        print(f"维度名非法：{dim}。每段仅允许小写字母、数字和连字符，支持 / 子目录分隔。")
        sys.exit(1)

    details = mdbase / "details"
    target = details / f"{dim}.md"
    if target.exists():
        print(target.read_text(encoding="utf-8"))
    else:
        print(f"mdbase/details/{dim}.md 不存在。尚未记录相关想法。")


def show_all(mdbase: Path):
    """显示所有维度文件及条目数。"""
    details = mdbase / "details"
    if not details.exists():
        print("mdbase/details/ 目录不存在。")
        return

    dims = list_dimensions(details)
    if not dims:
        print("mdbase 中无维度文件。")
        return

    print(f"mdbase 共 {len(dims)} 个维度：")
    for dim in dims:
        f = details / f"{dim}.md"
        if f.exists():
            content = f.read_text(encoding="utf-8")
            lines = [l for l in content.splitlines() if l.strip().startswith("- ")]
            print(f"  {dim}.md: {len(lines)} 条")


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(HELP)
        sys.exit(0)

    ustht = find_ustht()
    if ustht is None:
        print("错误：未找到 .ustht/ 目录。请先执行 /ustht init 初始化。")
        sys.exit(1)

    mdbase = ustht / "mdbase"
    if not mdbase.exists():
        print("mdbase 尚未初始化。请先执行 /ustht init。")
        sys.exit(1)

    # 解析参数
    args = sys.argv[1:]

    if not args or args == ["show"]:
        show_index(mdbase)
    elif args == ["show", "--all"]:
        show_all(mdbase)
    elif len(args) >= 2 and args[0] == "show":
        dim = args[1].lstrip("-")
        show_dimension(mdbase, dim)
    else:
        print(f"未知参数: {' '.join(args)}")
        print(f"用法: {sys.argv[0]} show [--all|--维度名]")
        print(f"示例: {sys.argv[0]} show rules")
        sys.exit(1)


if __name__ == "__main__":
    main()
