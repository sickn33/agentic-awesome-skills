#!/usr/bin/env python3
"""Find the silent text damage Windows tooling does: mojibake, a BOM, CRLF, invalid UTF-8.

Each of these passes a casual look and a clean-looking diff:
  - mojibake: UTF-8 read as an ANSI code page and written back, so a section sign gains a
    stray capital A-circumflex and an em dash becomes three characters (Windows
    PowerShell 5.1's Get-Content | Set-Content);
  - a UTF-8 BOM: PowerShell 5.1's `Set-Content -Encoding utf8` adds one, and some JSON,
    shell and config parsers choke on it;
  - CRLF: a tool or a delegate rewrites line endings; with core.autocrlf the diff is clean
    and the working tree is not, so tests that anchor on source text fail;
  - bytes that are not UTF-8 at all.
`grep -c $'\\r'` is not a reliable CRLF count under Git Bash; this reads bytes.

    python <skill dir>/scripts/check_text.py FILE_OR_DIR ...
    python <skill dir>/scripts/check_text.py --changed [REPO]   # modified + untracked files
    python <skill dir>/scripts/check_text.py --fix-crlf FILE ...  # CRLF -> LF, nothing else
    python <skill dir>/scripts/check_text.py --self-test

Exit 1 when any file has a problem, else 0. Binary files (a NUL byte in the first 8 KB)
are skipped. CRLF is accepted in extensions listed by --crlf-ok (default: .bat,.cmd).
Mojibake is never repaired here: restore the file from the last good commit and redo the
edit, because the CP1252 range 0x80-0x9F does not round-trip and a reversal loses text.
"""
import os
import subprocess
import sys
import tempfile

CODEPAGES = ("cp1252", "cp1250")  # Western and Central European ANSI code pages
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "out", ".next"}


def mojibake(text):
    """Runs of upper-half code-page characters that re-encode to valid multi-byte UTF-8:
    the signature of UTF-8 bytes decoded with an ANSI code page. Ordinary accented text
    ("café", "Łódź", "Ärger") does not re-encode that way, so it is not flagged."""
    hits = []
    for codec in CODEPAGES:
        run = []
        for ch in text + "\x00":
            try:
                high = ch.encode(codec)[0] >= 0x80
            except UnicodeEncodeError:
                high = False
            if high:
                run.append(ch)
                continue
            if len(run) >= 2:
                s = "".join(run)
                try:
                    fixed = s.encode(codec).decode("utf-8")
                except UnicodeDecodeError:
                    fixed = None
                if fixed and fixed != s:
                    hits.append((s, fixed))
            run = []
        if hits:
            return hits  # one code page's reading is enough; don't count the same run twice
    return hits


def check(path, crlf_ok):
    with open(path, "rb") as fh:
        data = fh.read()
    if b"\x00" in data[:8192]:
        return None
    problems = []
    if data.startswith(b"\xef\xbb\xbf"):
        problems.append("UTF-8 BOM")
    crlf = data.count(b"\r\n")
    lone_cr = data.count(b"\r") - crlf
    if crlf and os.path.splitext(path)[1].lower() not in crlf_ok:
        problems.append(f"{crlf} CRLF line ending(s)")
    if lone_cr:
        problems.append(f"{lone_cr} bare CR(s)")
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        problems.append(f"not valid UTF-8 (byte {exc.start})")
        return problems
    hits = mojibake(text)
    if hits:
        s, fixed = hits[0]
        problems.append(f"{len(hits)} mojibake run(s), e.g. {s!r} (was {fixed!r})")
    return problems


def files_under(paths):
    for p in paths:
        if os.path.isdir(p):
            for root, dirs, names in os.walk(p):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
                for n in names:
                    yield os.path.join(root, n)
        elif os.path.isfile(p):
            yield p


def changed_files(repo):
    out = subprocess.run(["git", "-C", repo, "status", "--porcelain", "-z", "--untracked-files=all"],
                         capture_output=True, check=True).stdout.decode("utf-8", "replace")
    entries = out.split("\0")
    files, i = [], 0
    while i < len(entries):
        e = entries[i]
        if len(e) > 3:
            status, name = e[:2], e[3:]
            if "R" in status or "C" in status:
                i += 1  # the next entry is the old name
            if "D" not in status:
                files.append(os.path.join(repo, name))
        i += 1
    return files


def fix_crlf(path):
    with open(path, "rb") as fh:
        data = fh.read()
    if b"\r\n" in data:
        with open(path, "wb") as fh:
            fh.write(data.replace(b"\r\n", b"\n"))
        return True
    return False


def self_test():
    d = tempfile.mkdtemp(prefix="check-text-")
    cases = {
        "clean.md": ("Café, Łódź, Ärger, a § and an em dash — here\n".encode("utf-8"), False),
        "ps51.md": (b"\xef\xbb\xbf" + "Section § and —\n".encode("utf-8").decode("cp1252").encode("utf-8")
                    .replace(b"\n", b"\r\n"), True),
        "cp1250.md": ("Łódź".encode("utf-8").decode("cp1250", "replace").encode("utf-8") + b"\n", True),
        "crlf.ts": (b"a\r\nb\r\n", True),
        "run.bat": (b"@echo off\r\necho hi\r\n", False),
        "latin1.txt": ("café\n".encode("latin-1"), True),
        "image.png": (b"\x89PNG\r\n\x1a\n\x00\x00", None),
    }
    failures = 0
    for name, (data, want_problem) in cases.items():
        p = os.path.join(d, name)
        with open(p, "wb") as fh:
            fh.write(data)
        got = check(p, {".bat", ".cmd"})
        ok = (got is None) if want_problem is None else (bool(got) == want_problem)
        print(("PASS  " if ok else "FAIL  ") + f"{name}: {got}")
        failures += 0 if ok else 1
    p = os.path.join(d, "crlf.ts")
    fix_crlf(p)
    ok = not check(p, set())
    print(("PASS  " if ok else "FAIL  ") + "fix-crlf leaves a clean file")
    failures += 0 if ok else 1
    print(f"\n{failures} failure(s)")
    return 1 if failures else 0


def main(argv):
    if "--self-test" in argv:
        return self_test()
    crlf_ok = {".bat", ".cmd"}
    if "--crlf-ok" in argv:
        i = argv.index("--crlf-ok")
        crlf_ok = {e.strip().lower() for e in argv[i + 1].split(",") if e.strip()}
        del argv[i:i + 2]
    do_fix = "--fix-crlf" in argv
    argv = [a for a in argv if a != "--fix-crlf"]
    if argv and argv[0] == "--changed":
        paths = changed_files(argv[1] if len(argv) > 1 else ".")
    else:
        paths = list(files_under(argv))
    if not paths:
        print(__doc__.strip().splitlines()[0])
        print("usage: check_text.py FILE_OR_DIR ... | --changed [REPO] | --fix-crlf FILE ... | --self-test")
        return 0
    bad = 0
    for p in paths:
        problems = check(p, crlf_ok)
        if not problems:
            continue
        if do_fix and any("CRLF" in x for x in problems) and fix_crlf(p):
            problems = [x for x in problems if "CRLF" not in x] + ["CRLF fixed"]
        bad += 1 if [x for x in problems if x != "CRLF fixed"] else 0
        print(f"{p.replace(os.sep, '/')}: " + "; ".join(problems))
    return 1 if bad else 0


if __name__ == "__main__":
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    sys.exit(main(sys.argv[1:]))
