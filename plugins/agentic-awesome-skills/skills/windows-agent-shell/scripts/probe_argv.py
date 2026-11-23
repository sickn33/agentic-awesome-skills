#!/usr/bin/env python3
"""Print exactly what a program receives, after the shell has finished with your command.

When an argument might be split, re-quoted, path-converted or decoded differently by
Git Bash, PowerShell 5.1, PowerShell 7 or cmd, measure it instead of reasoning about it.
Put this script where the real program would go, in the same shell, with the same
arguments:

    python <skill dir>/scripts/probe_argv.py -c.extraMetadata.name=value
    python <skill dir>/scripts/probe_argv.py /repos/owner/name      # Git Bash path conversion

It prints one JSON object: the arguments as received, the working directory, and the
encodings Python chose for this process's pipes (which is what a hook or a tool reading
your output will get). Exit code 0, always.
"""
import json
import os
import sys

print(json.dumps({
    "argv": sys.argv[1:],
    "cwd": os.getcwd(),
    "stdin_encoding": getattr(sys.stdin, "encoding", None),
    "stdout_encoding": getattr(sys.stdout, "encoding", None),
    "stderr_encoding": getattr(sys.stderr, "encoding", None),
    "PYTHONUTF8": os.environ.get("PYTHONUTF8"),
    "MSYS_NO_PATHCONV": os.environ.get("MSYS_NO_PATHCONV"),
}, ensure_ascii=True))
