"""Toggle SKILL_STATUS and INSTANT_STATUS."""
import sys

from common import find_ustht, read_define_ini, write_define_ini

HELP = """Usage: python toggle.py skill|instant [on|off] [--help]

Subcommands:
  skill           Show SKILL_STATUS
  skill on|off    Set SKILL_STATUS
  instant         Show INSTANT_STATUS
  instant on|off  Set INSTANT_STATUS

Note: instant on requires SKILL_STATUS=on.
"""


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(HELP)
        sys.exit(0)

    ustht = find_ustht()
    if ustht is None:
        print("Error: .ustht/ was not found. Run /ustht init first.")
        sys.exit(1)

    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} skill|instant [on|off]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd not in {"skill", "instant"}:
        print(f"Unknown command: {cmd}. Available: skill, instant")
        sys.exit(1)

    cfg = read_define_ini(ustht)
    ini_key = "SKILL_STATUS" if cmd == "skill" else "INSTANT_STATUS"

    if len(sys.argv) == 2:
        print(f"{ini_key}={cfg.get(ini_key, 'unknown')}")
        return

    val = sys.argv[2]
    if val not in {"on", "off"}:
        print(f"Invalid value: {val}. Available values: on | off")
        sys.exit(1)

    if cmd == "instant" and val == "on" and cfg.get("SKILL_STATUS") == "off":
        print("SKILL is off; instant capture cannot be enabled. Run /ustht skill on first.")
        sys.exit(1)

    cfg[ini_key] = val
    if cmd == "skill" and val == "off":
        cfg["INSTANT_STATUS"] = "off"
    write_define_ini(ustht, cfg)

    if cmd == "skill":
        if val == "off":
            print("SKILL is off. Instant capture has been paused.")
        else:
            print("SKILL is on.")
    else:
        print("Instant capture is on." if val == "on" else "Instant capture is off.")


if __name__ == "__main__":
    main()
