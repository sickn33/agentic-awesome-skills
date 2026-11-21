#!/usr/bin/env python3
"""Pipe sample PreToolUse JSON into the guard hooks and check what they decide.

No agent needed: a command hook is a program that reads JSON on stdin and answers with
an exit code and stdout, so it is tested like one. Run after every edit to a hook or
its config:

    python <this file's folder>/test_hooks.py    (once installed: python .claude/hooks/test_hooks.py)

It tests the shipped example rules. When you replace them, replace the cases in
guard_cases with your own (keep the canary cases): one that must ask, one look-alike that must not. The
look-alikes are the point; the original guard was narrowed after firing on a heredoc
that only mentioned a command.
"""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
GUARD = os.path.join(HERE, "guard_one_way_doors.py")
IDENTITY = os.path.join(HERE, "block_wrong_identity.py")


def pre_tool_use(command, cwd):
    return {
        "session_id": "test",
        "cwd": cwd,
        "permission_mode": "auto",
        "hook_event_name": "PreToolUse",
        "tool_name": "Bash",
        "tool_input": {"command": command, "description": "test"},
        "tool_use_id": "toolu_test",
    }


def run(script, payload, env=None, cwd=None):
    stdin = payload if isinstance(payload, str) else json.dumps(payload)
    full_env = dict(os.environ, **(env or {}))
    for key in ("ONE_WAY_DOORS_CONFIG", "ONE_WAY_DOORS_MODE", "BLOCKED_GIT_EMAILS", "GIT_IDENTITY_HINT"):
        if key not in (env or {}):
            full_env.pop(key, None)
    # Run where a hook runs, the session's folder, so a project's own cleanup.py is never read.
    p = subprocess.run([sys.executable, script], input=stdin, capture_output=True,
                       encoding="utf-8", errors="replace", env=full_env, cwd=cwd or None)
    decision = None
    if p.stdout.strip():
        decision = json.loads(p.stdout)["hookSpecificOutput"]["permissionDecision"]
    return p.returncode, decision, p.stdout.strip(), p.stderr.strip()


def main():
    tmp = tempfile.mkdtemp(prefix="guard-test-")
    with open(os.path.join(tmp, "cleanup.py"), "w", encoding="utf-8") as fh:
        fh.write("from client import Client\nClient().delete_post(42)\n")
    with open(os.path.join(tmp, "notes.py"), "w", encoding="utf-8") as fh:
        fh.write('"""Never run publish_cli.py delete from here."""\nprint("ok")\n')
    os.makedirs(os.path.join(tmp, "webhooks"))
    with open(os.path.join(tmp, "webhooks", "test_hooks.py"), "w", encoding="utf-8") as fh:
        fh.write("from client import Client\nClient().delete_post(9)\n")

    # (name, command, env, expected exit code, expected decision)
    guard_cases = [
        ("public delete asks", "gh repo delete me/old-site --yes", None, 0, "ask"),
        ("chained publish asks", "npm run build && npm publish", None, 0, "ask"),
        ("ordinary command passes", "npm test", None, 0, None),
        ("heredoc that only MENTIONS a delete passes",
         "cat > todo.md <<'EOF'\nlater: gh repo delete me/old-site\nEOF", None, 0, None),
        ("inline script calling the delete API asks",
         "python - <<'EOF'\nfrom client import Client\nClient().delete_post(42)\nEOF", None, 0, "ask"),
        ("local script calling the delete API asks", "python cleanup.py", None, 0, "ask"),
        ("local script whose docstring mentions a delete passes", "python notes.py", None, 0, None),
        ("the wiring canary asks", "true guard-canary", None, 0, "ask"),
        ("a delete chained on a heredoc's opener line asks",
         "cat <<'EOF' && gh release delete v1 --yes\nhello\nEOF", None, 0, "ask"),
        ("a mention of the canary passes", "git log --grep guard-canary", None, 0, None),
        ("another project's test_hooks.py calling the delete API asks", "python webhooks/test_hooks.py", None, 0, "ask"),
        ("this guard's own test runner passes", "python " + os.path.join(HERE, "test_hooks.py"), None, 0, None),
        ("deny mode denies", "gh gist delete 123", {"ONE_WAY_DOORS_MODE": "deny"}, 0, "deny"),
        ("block mode exits 2", "npm publish", {"ONE_WAY_DOORS_MODE": "block"}, 2, None),
        ("unparseable input passes", "<<not json>>", None, 0, None),
    ]
    if os.name == "nt":
        drive, rest = os.path.splitdrive(tmp.replace("\\", "/"))
        guard_cases.append(("Git Bash /c/ path to a local script asks",
                            f"python /{drive[0].lower()}{rest}/cleanup.py", None, 0, "ask"))

    identity_env = {"BLOCKED_GIT_EMAILS": "wrong@example.com", "GIT_IDENTITY_HINT": "Right Person <right@example.com>"}
    identity_cases = [
        ("user.email via -c blocks", "git -c user.email=wrong@example.com commit -m x", 2),
        ("git config user.email blocks", 'git config user.email "wrong@example.com"', 2),
        ("commit --author blocks", 'git commit --author="Someone <wrong@example.com>" -F msg.txt', 2),
        ("author env var blocks", "GIT_AUTHOR_EMAIL=wrong@example.com git commit -F msg.txt", 2),
        ("searching git log by author passes", "git log --author=wrong@example.com --oneline", 0),
        ("git log --grep commit by author passes", "git log --author=wrong@example.com --grep commit", 0),
        ("commit --author after -C blocks", 'git -C "my repo" commit --author="X <wrong@example.com>" -F msg.txt', 2),
        ("grep for the address passes", "grep -rn wrong@example.com .", 0),
        ("the right identity passes", "git -c user.email=right@example.com commit -F msg.txt", 0),
        ("the live check's `true user.email=` blocks", "true user.email=wrong@example.com", 2),
    ]

    failures = 0

    def check(name, ok, detail):
        nonlocal failures
        print(("PASS  " if ok else "FAIL  ") + name + ("" if ok else f"   -> {detail}"))
        failures += 0 if ok else 1

    for name, command, env, want_code, want_decision in guard_cases:
        payload = command if command.startswith("<<not") else pre_tool_use(command, tmp)
        code, decision, out, err = run(GUARD, payload, env, tmp)
        check("guard: " + name, code == want_code and decision == want_decision,
              f"exit {code}, decision {decision}, stdout {out!r}, stderr {err!r}")

    config = os.path.join(tmp, "doors.json")
    with open(config, "w", encoding="utf-8") as fh:
        json.dump({"mode": "block", "command_rules": [[r"\bwdróż\s+prod\b", "wdrożenie na produkcję"]]}, fh)
    code, _, _, err = run(GUARD, pre_tool_use("wdróż prod --teraz", tmp), {"ONE_WAY_DOORS_CONFIG": config})
    check("guard: config file + non-ASCII rule and reason survive UTF-8 round trip",
          code == 2 and "wdrożenie na produkcję" in err, f"exit {code}, stderr {err!r}")
    code, _, _, err = run(GUARD, pre_tool_use("npm publish", tmp), {"ONE_WAY_DOORS_CONFIG": config})
    check("guard: a config file's rules replace the built-in ones", code == 0, f"exit {code}, stderr {err!r}")
    code, _, _, err = run(GUARD, pre_tool_use("true guard-canary", tmp), {"ONE_WAY_DOORS_CONFIG": config})
    check("guard: the canary answers whatever a config file's rules", code == 2 and "canary" in err, f"exit {code}, stderr {err!r}")

    cursor = {"hook_event_name": "beforeShellExecution", "command": "gh release delete v1 --yes", "cwd": tmp}
    code, _, _, err = run(GUARD, cursor, {"ONE_WAY_DOORS_MODE": "block"})
    check("guard: Cursor-shaped input, block mode exits 2", code == 2 and "release delete" in err, f"exit {code}, stderr {err!r}")

    for name, command, want_code in identity_cases:
        code, _, _, err = run(IDENTITY, pre_tool_use(command, tmp), identity_env)
        check("identity: " + name, code == want_code, f"exit {code}, stderr {err!r}")

    code, _, _, _ = run(IDENTITY, pre_tool_use("git -c user.email=wrong@example.com commit", tmp))
    check("identity: nothing configured passes", code == 0, f"exit {code}")

    print(f"\n{failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
