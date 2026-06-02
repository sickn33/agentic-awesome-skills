"""user-thoughts init — 从模板初始化 .ustht/ 目录。

用法:
    python init.py [--help]

在当前工作目录下创建 .ustht/ 并复制模板文件。
"""
import sys
import shutil
from pathlib import Path

from common import find_skill_dir

HELP = """用法: python init.py [--help]

在当前工作目录下初始化 .ustht/ 目录。

操作:
  1. 创建 .ustht/ 目录
  2. 从技能模板复制 mdbase/ 结构
  3. 创建 raw/、ignored/、export/ 空目录
  4. 初始化 define.ini (SKILL_STATUS=on, INSTANT_STATUS=off)

若 .ustht/ 已存在，输出提示并跳过，不覆盖。"""


def copy_template(template_dir: Path, target_dir: Path):
    """复制模板文件到目标目录，跳过符号链接。"""
    for item in template_dir.rglob("*"):
        if item.is_symlink():
            continue
        rel = item.relative_to(template_dir)
        dest = target_dir / rel
        if item.is_dir():
            dest.mkdir(parents=True, exist_ok=True)
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, dest)


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(HELP)
        sys.exit(0)

    cwd = Path.cwd()
    ustht = cwd / ".ustht"

    if ustht.exists():
        print("已初始化。.ustht/ 目录已存在，跳过创建。")
        sys.exit(0)

    skill_dir = find_skill_dir()
    if skill_dir is None:
        print("错误：未找到 SKILL.md。请确保脚本位于 user-thoughts/scripts/ 目录下。")
        sys.exit(1)

    template = skill_dir / "assets" / "Runtime-Template"
    if not template.exists():
        print(f"错误：模板目录不存在：{template}")
        sys.exit(1)

    # 创建 .ustht/ 并复制模板
    ustht.mkdir(parents=True, exist_ok=True)
    copy_template(template, ustht)

    # 确保空目录存在
    for subdir in ["raw", "ignored", "export"]:
        (ustht / subdir).mkdir(exist_ok=True)

    # 验证 define.ini
    ini = ustht / "define.ini"
    if not ini.exists():
        ini.write_text("SKILL_STATUS=on\nINSTANT_STATUS=off\nLAST_SORTIN=\n", encoding="utf-8")

    print("已初始化。")
    print(f"  .ustht/")
    print(f"  ├── define.ini (SKILL_STATUS=on, INSTANT_STATUS=off, LAST_SORTIN=)")
    print(f"  ├── raw/")
    print(f"  ├── ignored/")
    print(f"  ├── export/")
    print(f"  └── mdbase/")
    print(f"      ├── README.ai.md")
    print(f"      ├── backlog.md")
    print(f"      └── details/ (rules, plans, dev-stack, general, ui/)")


if __name__ == "__main__":
    main()
