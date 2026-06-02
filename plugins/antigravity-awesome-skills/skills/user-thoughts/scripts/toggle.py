"""user-thoughts toggle — 管理 SKILL 和即时计划的启用状态。

用法:
    python toggle.py skill [on|off]      # 查看/设置 SKILL_STATUS
    python toggle.py instant [on|off]    # 查看/设置 INSTANT_STATUS
"""
import sys
from pathlib import Path

from common import find_ustht, read_define_ini, write_define_ini

HELP = """用法: python toggle.py skill|instant [on|off] [--help]

管理 SKILL 和即时计划的启用状态。

子命令:
  skill           显示当前 SKILL_STATUS
  skill on|off    设置 SKILL_STATUS
  instant         显示当前 INSTANT_STATUS
  instant on|off  设置 INSTANT_STATUS

依赖关系: instant on 需要 SKILL_STATUS=on，否则返回错误。

示例:
  python toggle.py skill           # 查看技能状态
  python toggle.py skill off       # 关闭技能
  python toggle.py instant on      # 开启即时计划"""


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(HELP)
        sys.exit(0)

    ustht = find_ustht()
    if ustht is None:
        print("错误：未找到 .ustht/ 目录。请先执行 /ustht init 初始化。")
        sys.exit(1)

    cfg = read_define_ini(ustht)

    if len(sys.argv) < 2:
        print(f"用法: {sys.argv[0]} skill|instant [on|off]")
        sys.exit(1)

    key_map = {
        "skill": "SKILL_STATUS",
        "instant": "INSTANT_STATUS",
    }

    cmd = sys.argv[1].lower()
    if cmd not in key_map:
        print(f"未知命令: {cmd}。可用: skill, instant")
        print(f"用法: {sys.argv[0]} skill|instant [on|off]")
        sys.exit(1)

    ini_key = key_map[cmd]

    if len(sys.argv) == 2:
        # 显示当前值
        val = cfg.get(ini_key, "未知")
        print(f"{ini_key}={val}")
        return

    val = sys.argv[2].lower()
    if val not in ("on", "off"):
        print(f"参数不合法: {val}。可用值: on | off")
        print(f"用法: {sys.argv[0]} {cmd} on|off")
        sys.exit(1)

    # 依赖检查：instant on 需要 SKILL_STATUS=on
    if cmd == "instant" and val == "on" and cfg.get("SKILL_STATUS") == "off":
        print("SKILL 已关闭，即时计划无法开启。请先执行 /ustht skill on。")
        sys.exit(1)

    cfg[ini_key] = val
    write_define_ini(ustht, cfg)

    if cmd == "skill":
        if val == "off":
            print("SKILL 已关闭。即时计划已暂停。")
        else:
            print("SKILL 已开启。")
    elif cmd == "instant":
        if val == "on":
            print("即时计划已开启。")
        else:
            print("即时计划已关闭。")


if __name__ == "__main__":
    main()
