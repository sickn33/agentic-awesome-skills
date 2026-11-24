#!/usr/bin/env python3
"""review.py — Runs one unsteered independent review round.

The session that built the code never clears it. Wrapper only. The how-and-when discipline (what a
round is scoped to, the stopping rule, author != reviewer, how to triage what
comes back) lives in ../SKILL.md: the independent-review skill's, or, for the copy ship-check carries,
its Step 6. Read it before invoking this.

--reviewer auto (the default) uses a fresh Codex session, then fresh headless
Claude Code, then Grok, in order of availability. All run read-only, with user
MCP configuration and session memory excluded where the CLI allows.
Codex excludes user config, including its MCP servers and project trust, and
execpolicy rules. Connected apps, plugins, tool suggestions, web search, image
generation, memory and the saved session are off; hooks are disabled by flag.
Repository and CODEX_HOME AGENTS.md, bundled skills and agent-spawning tools
remain. A spawn failed in an ephemeral session (Codex CLI 0.166.0, observed
2026-11-14); that is not guaranteed. Administrator system, managed or cloud
configuration can add context and tools; those layers were not observable here.
The wrapper checks events, not flags alone: completed outside MCP calls, web searches,
completed file changes or no successful command fail the Codex round.
--check names the isolation and flags. The building thread never reviews.

THE REASON THIS EXISTS, and it is one specific failure (2026-09-08):

    A review round run without --always-approve EXITS 0 AFTER ONE LINE, and
    that looks exactly like a clean round.

No error, no timeout, exit code 0, a sentence or two of preamble. Two rounds
were read as "the reviewer found nothing" before a third, run properly, found
a real defect in the same commit both silent rounds had "cleared". The failure
is biased toward SILENCE, so it always reads as good news.

This wrapper closes that gap in three ways:

  1. The flags that make a round real are applied here, not remembered.
  2. A round whose output is too short to be a real round FAILS LOUDLY
     (exit 2) instead of printing a few lines and returning 0.
  3. Codex's event stream proves commands succeeded and checks tool isolation.

A round that comes back genuinely empty
still argues its way there over paragraphs; one that comes back in three lines
did not run. Treat a suspiciously short clean round as a failed round, never
as a fast one.

Codex's report is its last agent_message, never the raw JSON stream. With --out,
raw stdout is saved at <out>.events.jsonl, including partial output on failure.
Treat both files as private review artifacts; never commit them.

Usage:
    python review.py --brief BRIEF.md --cwd REPO --subject origin/PROD..HEAD
    python review.py --brief BRIEF.md --cwd REPO --subject HEAD   # nothing released yet: every file and every removed line
    python review.py --brief BRIEF.md --cwd REPO --subject abc123^! --out round2.md
  PROD is whatever the repository says was last released (a branch, a tag).
    python review.py --check          # which reviewer, and its flags; run nothing
    python review.py --brief BRIEF.md --cwd REPO --subject HEAD --subject-only
                                           # none of the three CLIs: write subject and prompt, print paths
    python review.py --reviewer codex ...    # force a fresh Codex reviewer
    python review.py --reviewer claude ...   # force a fresh Claude Code reviewer

There is deliberately NO way to pass a prompt inline. The brief goes in a file
(a command over ~10k chars is downgraded by the permission analyser, and a
brief in a file is better practice anyway), and --cwd is mandatory (without it
a delegate works in the *session's* directory and can resume another repo's
thread). Both are correctness rules that happen to also avoid a prompt.

Grok binary lookup, in order:
    1. $GROK_BIN
    2. ~/.grok/bin/grok[.exe]
    3. `grok` on PATH (via shutil.which)
Codex binary lookup: $CODEX_BIN, then `codex` on PATH (the native binary behind
an npm shim when available), then the OpenAI ChatGPT VS Code extension bundle.
Claude Code is $CLAUDE_BIN, or `claude` on PATH.

Exit codes:
    0  round completed and looks like a real round
    1  usage / environment problem (no binary, bad path, missing flag)
    2  FAILED ROUND: short report; Codex had no successful command, ran an
       outside MCP tool, searched the web, changed a file, or returned missing
       events, no agent_message, or a failed turn despite exit 0
    3  the reviewer answered that its account is out of usage: the round did
       not run; the message gives the next installed reviewer or --subject-only
    N  the reviewer's own non-zero exit, passed through
"""

from __future__ import annotations  # `str | None` annotations on Python 3.9, macOS's stock python3

import argparse
import atexit
import getpass
import io
import json
import os
import platform
import re
import shlex
import shutil
import subprocess
import sys
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

GROK_BIN_NAME = "grok.exe" if platform.system() == "Windows" else "grok"
CODEX_BIN_NAME = "codex.exe" if platform.system() == "Windows" else "codex"

# A real round argues its way to its conclusion over paragraphs. Measured on
# 2026-09-16, a genuine round over a two-commit range came back at 15,292
# bytes; the 2026-09-08 silent failures were "a sentence or two". 1500 sits far
# enough below a real round to avoid false alarms and far enough above a
# preamble to catch the failure this wrapper exists for.
DEFAULT_MIN_CHARS = 1500

# An account out of credit answers in a line, which reads as a failed round with no next step.
# Observed 2026-10-31: a signed-in Grok CLI answered "402 usage balance exhausted".
# Grok/Claude checks run only after a non-zero exit or a short answer.
# Codex checks only error-event messages and stderr, never the report or command output.
OUT_OF_USAGE = re.compile(
    r"usage balance (?:is )?exhausted|insufficient (?:credits?|balance|funds)|credit balance is too low"
    r"|exceeded your (?:current )?quota|\b402\b[^\n]{0,40}(?:payment required|balance|credits?|quota)"
    r"|you['’]ve hit your (?:usage )?limit\b",
    re.IGNORECASE,
)

# A brief thinner than this is very unlikely to carry the goal, the constraints
# that bind, and how to prove it. Warned about, never fatal — some legitimate
# fix-sized rounds are short.
THIN_BRIEF_CHARS = 400

# The flags that make a round a REVIEW rather than a build, applied every time.
#   --always-approve      lets it use tools at all; without it, the silent exit
#   --tools               an ALLOWLIST of read-only tools: the write boundary
#
# Measured 2026-10-10 on Windows: `--sandbox read-only --always-approve
# --disallowed-tools edit,write` still created a file. The sandbox enforces only
# where the platform supports it, and a denylist leaves the shell and the edit
# tool in place. With `--tools read_file,grep,list_dir` the same prompt could not
# write. A reviewer with no shell cannot run git, so the subject goes on disk
# first (--subject below).
#
# `--tools` allowlists built-in tools only: the MCP meta-tools (search_tool,
# use_tool) stay unless removed, and through them any connected MCP server's
# tools, a database's included. So they are removed (`--disallowed-tools` wins
# over `--tools`), and every MCP call, shell command, edit and write is denied
# as well (a deny rule wins over --always-approve). Web tools are off: a review
# reads this repository, nothing else.
READ_ONLY_TOOLS = "read_file,grep,list_dir"
REVIEW_FLAGS = [
    "--always-approve",
    "--tools", READ_ONLY_TOOLS,
    "--disallowed-tools", "search_tool,use_tool",
    "--deny", "MCPTool", "--deny", "Bash", "--deny", "Edit", "--deny", "Write",
    "--disable-web-search",
]

# A fresh headless Claude Code reviewer. --restricted
# removes every code-running tool and ignores the user, project and local
# settings files, so no hook, plugin or personal setting rides along; --tools is
# the allowlist on top (read-only tools only; no shell, so the subject goes on
# disk as for Grok); --strict-mcp-config with no config loads no MCP server;
# --no-session-persistence leaves nothing to resume. Auto-memory is switched off
# in its environment (CLAUDE_CODE_DISABLE_AUTO_MEMORY=1): measured 2026-10-10, a
# headless session otherwise loads the project's memory index, which holds the
# builder's notes. Measured the same day: with these flags no project instructions,
# personal notes, memory or skills list is in its context, so like Grok it reads the
# project's spec because the brief names it, not because it was handed it.
# Re-measured on 2.1.311, 2026-10-30: a canary CLAUDE.md and CLAUDE.local.md loaded without
# --restricted, and neither did with it.
CLAUDE_READ_ONLY_TOOLS = "Read,Grep,Glob"
CLAUDE_REVIEW_FLAGS = [
    "-p", "--restricted", "--tools", CLAUDE_READ_ONLY_TOOLS, "--strict-mcp-config",
    "--no-session-persistence", "--output-format", "text",
]

# The command in codex-agents § Reviewer. User config alone does not exclude
# account tools (Codex CLI 0.166.0, macOS, observed 2026-11-14: 546 tools before,
# 22 after the feature flags and web_search setting). Hooks are disabled by
# flag; their absence was not measured. AGENTS.md, bundled skills and agent
# tools remain; administrator system/managed/cloud layers were not observable.
# Instruction files were not shown disabled (Codex CLI 0.159.0, observed 2026-10-29).
# Windows reads/writes were checked on 0.166.0, 2026-11-02 with the old flags;
# the new feature flags were not run on Windows. Events check what actually ran.
CODEX_DISABLED_FEATURES = ("apps", "plugins", "tool_suggest", "image_generation", "memories", "hooks")
CODEX_REVIEW_FLAGS = [
    "exec", "--json", "--ephemeral", "--ignore-user-config", "--ignore-rules", "-s", "read-only",
    *[arg for feature in CODEX_DISABLED_FEATURES for arg in ("--disable", feature)],
    "-c", "web_search=disabled",
]
CODEX_ISOLATION = (
    "fresh ephemeral session; read-only shell. User config (including its MCP servers and project trust), "
    "execpolicy rules, connected apps, plugins, tool suggestions, web search, image generation, memory "
    "and saved session off; hooks disabled by flag. Repository and CODEX_HOME AGENTS.md, bundled skills "
    "and agent-spawning tools remain. A spawn failed in an ephemeral session "
    "(Codex CLI 0.166.0, observed 2026-11-14), without guaranteeing future failure. "
    "Administrator system, managed or cloud configuration can add tools or context; those layers were not observable here. "
    "Events fail the round for a completed outside MCP call, web search, completed file change or no successful command. "
    "Name loaded instruction files and remaining context in the report."
)

# A file read returns at most this many lines per call (Grok's read_file does not
# say there are more), so the prompt states the subject's length and how to page.
READ_FILE_LINES = 1000

# An untracked file's content goes into the subject only below this size; above
# it, only its name (the reviewer can still open it by path).
UNTRACKED_INLINE_BYTES = 200_000

# The cap above is per file, so a directory of small generated files goes in
# whole. Past these, the wrapper warns (never refuses: an untracked file is how a
# change goes unreviewed). The floor keeps a small round whose change is one new
# file from warning just because that file is most of it.
UNTRACKED_WARN_LINES = 20_000
UNTRACKED_WARN_FLOOR = 5_000


def find_grok_bin() -> str | None:
    """Locate the grok CLI. Env override > ~/.grok/bin > PATH. None when absent."""
    env_override = os.environ.get("GROK_BIN")
    if env_override:
        if Path(env_override).exists():
            return env_override
        sys.exit(f"[review.py] $GROK_BIN is set but does not exist: {env_override}")

    home_bin = Path.home() / ".grok" / "bin" / GROK_BIN_NAME
    if home_bin.is_file():
        return str(home_bin)

    return shutil.which("grok")


def find_claude_bin() -> str | None:
    env_override = os.environ.get("CLAUDE_BIN")
    if env_override:
        if Path(env_override).exists():
            return env_override
        sys.exit(f"[review.py] $CLAUDE_BIN is set but does not exist: {env_override}")
    return shutil.which("claude")


def native_of_npm_shim(shim: str) -> str | None:
    """The native binary behind an npm shim, copied from codex-agents for standalone use."""
    res = Path(shim).resolve()
    roots = [res.parent / "node_modules" / "@openai" / "codex"]
    roots += [p for p in res.parents if p.name == "codex" and p.parent.name == "@openai"]
    for root in roots:
        for p in sorted(root.glob(f"node_modules/@openai/codex-*/vendor/*/bin/{CODEX_BIN_NAME}"), reverse=True):
            if p.is_file():
                return str(p)
    return None


def find_codex_bin() -> str | None:
    """Env override > installed CLI (native npm binary preferred) > extension bundle."""
    env_override = os.environ.get("CODEX_BIN")
    if env_override:
        if Path(env_override).exists():
            return env_override
        sys.exit(f"[review.py] $CODEX_BIN is set but does not exist: {env_override}")
    path_hit = shutil.which("codex")
    if path_hit:
        native = native_of_npm_shim(path_hit)
        if native:
            return native
        if not (platform.system() == "Windows" and Path(path_hit).suffix.lower() in (".cmd", ".bat", ".ps1")):
            return path_hit
    ext_root = Path.home() / ".vscode" / "extensions"
    if ext_root.exists():
        for ext in sorted(ext_root.glob("openai.chatgpt-*"), reverse=True):
            for bin_path in ext.glob(f"bin/*/{CODEX_BIN_NAME}"):
                if bin_path.is_file():
                    return str(bin_path)
    return path_hit


def pick_reviewer(choice: str) -> tuple[str, str]:
    """(reviewer, binary). auto: first installed of Codex, Claude Code, Grok."""
    for reviewer, finder in (("codex", find_codex_bin), ("claude", find_claude_bin), ("grok", find_grok_bin)):
        if choice in ("auto", reviewer):
            binary = finder()
            if binary:
                return reviewer, binary
            if choice == reviewer:
                sys.exit(f"[review.py] could not locate {reviewer}. Install its CLI, set "
                         f"${reviewer.upper()}_BIN, or choose another --reviewer (auto, codex, claude, grok).")
    sys.exit("[review.py] none of the Codex, Claude Code or Grok CLIs was found. The review is "
             "still mandatory: run with --subject-only to write the subject and prompt files, then give "
             "the prompt to a fresh read-only session of your agent, started as a separate process in the "
             "checkout, never a subagent, fork or resumed session of this one (the independent-review skill, "
             "'Running it'; ship-check, Step 6).")


def supported_flags(binary: str, reviewer: str) -> set[str]:
    """Flags the installed CLI actually advertises.

    The discipline this wrapper encodes says to verify a flag is accepted
    before relying on it rather than trusting prose that may predate the
    binary. CLI help costs a second and no API call; Codex's flags live under exec."""
    cmd = [binary, *(["exec"] if reviewer == "codex" else []), "--help"]
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            input="",
            timeout=60,
        )
    except (OSError, subprocess.SubprocessError) as err:
        sys.exit(f"[review.py] could not run `{shlex.join(cmd)}`: {err}")
    if proc.returncode != 0:
        sys.exit(f"[review.py] `{shlex.join(cmd)}` exited {proc.returncode}: {proc.stderr.strip()}")
    text = proc.stdout + proc.stderr
    return {tok.split("=")[0] for tok in text.split() if tok.startswith("--")}


def require_flags(binary: str, wanted: list[str], reviewer: str) -> None:
    have = supported_flags(binary, reviewer)
    missing = [f for f in wanted if f not in have]
    if missing:
        sys.exit(
            f"[review.py] this {Path(binary).stem} build does not advertise: "
            + ", ".join(missing)
            + "\n  The review spelling depends on them. Check its help (Codex: `exec --help`) and "
            "update this wrapper rather than dropping the flag — dropping "
            "--always-approve is exactly the silent-failure this exists to stop."
        )


def missing_codex_features(binary: str) -> list[str]:
    """Read advertised feature names without silently accepting a changed CLI."""
    cmd = [binary, "features", "list"]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                              errors="replace", input="", timeout=60)
    except (OSError, subprocess.SubprocessError) as err:
        reason = f"could not run `codex features list`: {err}"
        have = set()
    else:
        have = {line.split()[0] for line in proc.stdout.splitlines() if line.split()} if proc.returncode == 0 else set()
        reason = (f"`codex features list` exited {proc.returncode}: {proc.stderr.strip()}"
                  if proc.returncode else "name not advertised by `codex features list`")
    return [f"--disable {name}: {reason}; CLI is older or newer than the Codex CLI 0.166.0 "
            "this was written against" for name in CODEX_DISABLED_FEATURES if name not in have]


def warn_codex_administrator_files() -> None:
    """Existence only: these layers may override flags; never read their contents."""
    system = platform.system()
    if system == "Windows":
        codex_home = Path(os.environ.get("CODEX_HOME") or (Path.home() / ".codex"))
        paths = [codex_home / "managed_config.toml"]
        if os.environ.get("ProgramData"):
            paths.append(Path(os.environ["ProgramData"]) / "OpenAI" / "Codex" / "requirements.toml")
    else:
        paths = [Path("/etc/codex") / name for name in ("config.toml", "managed_config.toml", "requirements.toml")]
        if system == "Darwin":
            preferences = Path("/Library/Managed Preferences")
            paths += [preferences / "com.openai.codex.plist",
                      preferences / getpass.getuser() / "com.openai.codex.plist"]
    for path in paths:
        if path.exists():
            sys.stderr.write(f"[review.py] warning: {path} can add tools, MCP servers or hooks the wrapper "
                             "cannot switch off; the round fails if such a tool ran.\n")


# The prompt and subject files are named per run: rounds started in parallel
# against one checkout (one per area of a split range) otherwise overwrite each
# other's prompt, and every reviewer reads the last brief written (2026-10-22: three
# area rounds all reviewed the third area). Both are removed when the run exits.
RUN_ID = os.getpid()


def git_dir(cwd: Path) -> Path:
    proc = subprocess.run(["git", "rev-parse", "--absolute-git-dir"], cwd=str(cwd),
                          capture_output=True, text=True, encoding="utf-8", errors="replace")
    if proc.returncode != 0:
        sys.exit(f"[review.py] --cwd is not a git checkout: {cwd}")
    return Path(proc.stdout.strip())


def product_start(cwd: Path) -> str:
    """The range a first release's round takes: every file HEAD holds and every line its history removed."""
    return "\n    --subject HEAD   (every file HEAD holds and every line its history removed)"


def range_ends(rng: str) -> tuple[str, str] | None:
    """The (start, end) a range's cumulative diff runs between, for the shapes
    the skill uses: A..B (an empty side is HEAD, as git reads it), <sha>^!
    (against its first parent) and a bare ref, every file it holds (start "", the
    empty tree, so the first commit's files are included). None for anything else, such as A...B."""
    if rng and ".." not in rng and not any(c in rng for c in "^~ "):
        return "", rng
    if rng.endswith("^!"):
        return f"{rng[:-2]}^1", rng[:-2]
    if ".." in rng and "..." not in rng:
        start, end = rng.split("..", 1)
        return start or "HEAD", end or "HEAD"
    return None


def write_subject(cwd: Path, rng: str, net: bool = False, exclude: tuple[str, ...] = ()) -> tuple[Path, int]:
    """Not every reviewer has a shell, so the subject is written where all can read it:
    inside the git directory, which is never committed. The range's log with
    patches, plus the range's cumulative diff when it contains a merge (for a bare
    ref such as HEAD, its log with each commit's author and message, every file it
    holds, and every line its history removed), then
    everything uncommitted: tracked changes, and each untracked
    file listed by its own path (-uall) with its content (the skill reviews the
    working tree too, and an untracked file is how a change goes unreviewed)."""
    def git(*a: str, env: dict | None = None, raw: bool = False) -> str:
        """raw keeps a lone carriage return, which text mode would turn into a line break.
        The user's config can't change what the reviewer reads: colour is off (color.diff=always
        would start every removed line with an escape code, not "-"), the big-file threshold is
        git's default (a low core.bigFileThreshold shows a text file as binary), and replace
        refs are off (a graft hides commits a push still sends)."""
        off = ["--no-replace-objects", "-c", "core.bigFileThreshold=512m", "-c", "color.ui=never",
               "-c", "color.diff=never", "-c", "color.status=never"]
        proc = subprocess.run(["git", *off, *a], cwd=str(cwd), capture_output=True,
                              stdin=subprocess.DEVNULL, env=env)
        out = proc.stdout.decode("utf-8", "replace")
        if not raw:
            out = out.replace("\r\n", "\n").replace("\r", "\n")
        proc.stderr = proc.stderr.decode("utf-8", "replace")
        if proc.returncode != 0:
            hint = ""
            if "unknown revision" in proc.stderr or "ambiguous argument" in proc.stderr:
                hint = ("\n  A ref in that range doesn't exist. Check its spelling; if it names a remote "
                        "branch, run `git fetch` first, since a branch missing here is not proof that "
                        "nothing is released. If it is HEAD, "
                        "nothing is committed yet: commit the work first. If it names a release and "
                        "nothing has been released yet, round 1 is everything the first release ships "
                        f"(the independent-review skill, 'The subject'; ship-check, Step 6):{product_start(cwd)}")
            sys.exit(f"[review.py] git {' '.join(a)} failed: {proc.stderr.strip()}{hint}")
        return out
    # the empty tree's id depends on the repository's hash (SHA-1 or SHA-256)
    empty = git("hash-object", "-t", "tree", "--stdin").strip()
    # A commit's diff follows the attributes files, where `-diff` or `binary` shows a text
    # file as "Binary files differ", content left out. Read from the empty tree, with the
    # global and system files switched off, they leave out only what git itself finds
    # binary (--attr-source, git 2.41 and later). The repository's info/attributes has no
    # switch, so a rule there is warned about.
    attrs = ["-c", f"core.attributesFile={os.devnull}", f"--attr-source={empty}"]
    plain = {**os.environ, "GIT_ATTR_NOSYSTEM": "1"}
    if subprocess.run(["git", *attrs, "version"], cwd=str(cwd), capture_output=True,
                      stdin=subprocess.DEVNULL).returncode != 0:
        attrs = []
        sys.stderr.write("[review.py] warning: this git predates --attr-source (2.41), so a text "
                         "file that .gitattributes marks -diff or binary shows in the commits' diffs "
                         "without its content. Upgrade git.\n")
    info = cwd / git("rev-parse", "--git-path", "info/attributes").strip()
    try:
        rules = [r.strip() for r in info.read_text(encoding="utf-8", errors="replace").splitlines()
                 if r.strip() and not r.lstrip().startswith("#") and ("diff" in r or "binary" in r)]
    except OSError:
        rules = []
    if rules:
        sys.stderr.write(f"[review.py] warning: {info} has a rule that can show a text file as "
                         f"binary ({rules[0]}), and git has no switch for that file: paths it marks show in "
                         "the commits' diffs without their content. Move the rule out for the round.\n")
    # A bare ref is round 1 before any release, whose subject is what a push sends: every
    # file the ref holds, as a diff from the empty tree, after the log with each commit's
    # author and message, then every line its history removed. Patch by patch, a history
    # begun in another repository (a clone or a fork) can be many times that.
    ends = range_ends(rng)
    whole = bool(ends) and not ends[0]
    if net and (whole or not ends):
        sys.exit(f"[review.py] --net takes an A..B or <sha>^! subject, not {rng}")
    # --exclude: repository-root globs left out of every diff, log and status below.
    # --full-history keeps git log from dropping a merge's side when paths are given.
    spec = ["--", *(f":(top,glob,exclude){g}" for g in exclude)] if exclude else []
    hist = ["--full-history"] if exclude else []
    if whole or net:
        if whole:
            log = git("log", "--format=%h %ad %an <%ae>  %w(0,0,4)%s%+b%w(0)", "--date=short", rng)
            tree = git(*attrs, "diff", "--no-ext-diff", "--stat", "-p", empty, rng, *spec, env=plain)
        else:  # --net leaves out each commit's patch, so a line added and removed inside the range shows here
            log = git("log", "--oneline", *hist, rng, *spec)
            tree = ""
        # A push sends every commit, so a key replaced by a variable, or an .env deleted
        # or dropped on a merged branch, still ships. Every line the history held is in the
        # tree or was removed by a commit against one of its parents (-m, pinned so that
        # log.diffMerges can't change it), so those lines complete the subject: each once
        # per file (a lockfile removes the same lines on every upgrade), under the commit and
        # the file that first removed it, beside each binary file a commit touched, which
        # has no lines to show. Split on newlines only: a line may hold any other break.
        removed, seen, commit, path, shown, hunk = [], set(), "", "", "", False
        for line in git(*attrs, "-c", "log.diffMerges=separate", "log", "-p", "-m", "-U0", "--reverse",
                        "--no-renames", "--no-ext-diff", "--format=commit %h %ad %an  %s",
                        "--date=short", *hist, rng, *spec, env=plain, raw=True).split("\n"):
            line = line[:-1] if line.endswith("\r") else line
            if line.startswith("commit "):
                commit, path, hunk = line, "", False
            elif line.startswith("diff --git "):
                path, hunk = line, False
            elif line.startswith("@@"):
                hunk = True
            elif ((line.startswith("Binary files ") or hunk and line.startswith("-"))
                  and (path, line) not in seen):
                seen.add((path, line))
                if commit:
                    removed.append(commit)
                    commit, shown = "", ""
                if shown != path:
                    removed.append(path)
                    shown = path
                removed.append(line)
        if removed:
            tree += (f"\n# Every line {rng}'s history removed, each once per file, under the commit "
                     "that first removed it (each commit against each parent), and each binary file a "
                     "commit touched\n")
            tree += "\n".join(removed) + "\n"
    else:
        log = git(*attrs, "log", "--root", "--stat", "-p", *hist, rng, *spec, env=plain)
    status = git("status", "--porcelain", "-uall", *spec)  # not --short, which status.branch changes
    if not log.strip() and not status.strip():
        sys.exit(f"[review.py] --subject {rng} has no commits and the tree is clean: "
                 "nothing in that range, which is not the same as nothing to review. Round 1 "
                 "is the whole unreleased range: <last release>..HEAD, or before the first release "
                 f"(the independent-review skill, 'The subject'; ship-check, Step 6):{product_start(cwd)}")
    # `git log -p` shows a merge commit without its diff, so a conflict resolution,
    # or an edit made inside a merge, never reaches the reviewer from the log. A
    # two-dot diff of the range's ends does show it. Not `--cc`: a resolution that
    # keeps one parent's version over a line the range added has no combined hunk.
    merges = git("rev-list", "--merges", rng).split() if log.strip() and not whole and not net else []
    header = f"# Review subject: {rng}\n"
    cumulative = []
    if net:
        header = (f"# Review subject: {rng} (its one-line log, the range's cumulative diff, then every "
                  "line its history removed)\n")
        cumulative = [f"\n# Cumulative diff of the range: {ends[0]} {ends[1]}\n",
                      git(*attrs, "diff", "--no-ext-diff", "--stat", "-p", ends[0], ends[1], *spec, env=plain), tree]
    if whole:
        header = (f"# Review subject: {rng}, every file it holds (its log with each commit's author and "
                  "message, then each "
                  "file as a diff from the empty tree, then every line its history removed, each once per file)\n")
        cumulative = [f"\n# Every file {rng} holds\n", tree]
    if merges:
        header = (f"# Review subject: {rng} ({len(merges)} merge commit"
                  f"{'' if len(merges) == 1 else 's'}; the range's cumulative diff follows the log)\n")
        why = ("it contains merge commits, and `git log -p` shows a merge without its diff, so a "
               "conflict resolution or an edit made inside a merge appears only here")
        if ends:
            cumulative = [f"\n# Cumulative diff of the range: {ends[0]} {ends[1]} ({why})\n",
                          git(*attrs, "diff", "--no-ext-diff", "--stat", "-p", ends[0], ends[1], *spec, env=plain)]
        else:
            cumulative = [f"\n# Cumulative diff of the range: not computed for `{rng}` ({why}). "
                          "Run the round with an A..B range to include it.\n"]
            sys.stderr.write(f"[review.py] warning: {rng} contains merge commits but is not "
                             "an A..B, <sha>^! or bare-ref range, so the subject has no cumulative diff and "
                             "what the merges changed is not in it.\n")
    if exclude:
        header += "# Left out by --exclude: " + ", ".join(exclude) + "\n"
    parts = [header, log or "(no commits in this range)\n", *cumulative,
             "\n# Working tree (uncommitted)\n", status or "(clean)\n", git("diff", "--no-ext-diff", "--no-textconv", "HEAD", *spec)]
    # The working tree's diff keeps the attributes, whose line-ending and filter rules
    # it needs, so a path it shows as binary goes in again with --text when its
    # content is text on both sides.
    as_text = []
    for entry in git("diff", "--no-textconv", "--no-renames", "--numstat", "-z", "HEAD", *spec, raw=True).split("\0"):
        if not entry.startswith("-\t-\t"):
            continue
        rel = entry[4:]
        head = subprocess.run(["git", "cat-file", "blob", f"HEAD:{rel}"], cwd=str(cwd),
                              capture_output=True, stdin=subprocess.DEVNULL)
        sides = [head.stdout[:8192]] if head.returncode == 0 else []
        f = cwd / rel
        try:
            if f.is_file():
                with open(f, "rb") as fh:
                    sides.append(fh.read(8192))
        except OSError:
            continue
        if sides and all(b"\0" not in s for s in sides):
            as_text.append(rel)
    if as_text:
        parts.append("\n# Shown again as text (the attributes mark these -diff or binary; their content is text)\n")
        for i in range(0, len(as_text), 100):  # a command line has a length limit, on Windows 32,767
            parts.append(git("--literal-pathspecs", "diff", "--no-ext-diff", "--no-textconv", "--text", "HEAD", "--",
                             *as_text[i:i + 100]))
    untracked: list[tuple[int, int, str]] = []  # (lines, bytes, path) of each file inlined
    # -z gives raw paths: no quoting or octal escapes to undo, whatever the name.
    for entry in git("status", "--porcelain", "-z", "-uall", *spec, raw=True).split("\0"):
        if not entry.startswith("?? "):
            continue
        rel = entry[3:]
        f = cwd / rel
        # Size and type are checked before anything is read, and one bad path
        # becomes an "open it by path" line instead of aborting the round.
        try:
            if not f.is_file():
                parts.append(f"\n# Untracked: {rel} (not a regular file; open it by path)\n")
                continue
            size = f.stat().st_size
            if size > UNTRACKED_INLINE_BYTES:
                parts.append(f"\n# Untracked file: {rel} ({size} bytes, large; open it by path)\n")
                continue
            with open(f, "rb") as fh:
                data = fh.read(UNTRACKED_INLINE_BYTES + 1)
        except Exception as err:  # noqa: BLE001 — any failure here must not stop the round
            parts.append(f"\n# Untracked: {rel} (could not read: {err}; open it by path)\n")
            continue
        if b"\0" in data[:8192]:
            parts.append(f"\n# Untracked file: {rel} ({size} bytes, binary; open it by path)\n")
        else:
            body = data.decode('utf-8', errors='replace')
            parts.append(f"\n# Untracked file: {rel}\n{body}")
            untracked.append((body.count("\n") + 1, size, rel))
    text = "".join(parts)
    total = text.count("\n") + 1
    from_untracked = sum(u[0] for u in untracked)
    if from_untracked > UNTRACKED_WARN_LINES or (
            total > UNTRACKED_WARN_FLOOR and 2 * from_untracked > total):
        largest = ", ".join(u[2] for u in sorted(untracked, key=lambda u: -u[1])[:5])
        sys.stderr.write(f"[review.py] warning: {len(untracked)} untracked files add "
                         f"{from_untracked} of {total} subject lines; the largest: {largest}. "
                         "If they are not part of the change, stop this round, gitignore them (delete only "
                         "files this session generated; ask the owner about the rest), and run it again (the independent-review skill, 'The subject'; ship-check, Step 6).\n")
    path = git_dir(cwd) / f"review-subject-{RUN_ID}.diff"
    path.write_text(text, encoding="utf-8")
    return path, total


def compose_prompt(cwd: Path, brief: Path, subject: Path | None, lines: int = 0) -> Path:
    if subject:
        reading = (f"The subject is in `{subject}`: the range's commits with their diffs (and "
                   f"the range's cumulative diff when it contains a merge; for a bare ref such as "
                   f"HEAD, its log, every file it holds and every line its history removed, as "
                   f"its first line says), then "
                   f"the uncommitted working tree, untracked files with their content. It has "
                   f"{lines} lines. Some file tools return at most {READ_FILE_LINES} lines per call "
                   f"and may not say there are more, so page with limit {READ_FILE_LINES} "
                   f"and offset 1, {READ_FILE_LINES + 1}, {2 * READ_FILE_LINES + 1}, and so on "
                   f"until you pass line {lines}, or use equivalent shell line ranges. "
                   f"A single read is not the subject. ")
    else:
        reading = "No subject file was prepared, so read the working tree as it stands. "
    note = ("\n\n## Reading the subject\n\nYou have read-only tools. " + reading
            + f"Everything else you need is in the repository's files, at `{cwd}`. "
            + "Name the subject or changed files you read in the report, and any instruction files "
            "or other context still loaded.\n")
    path = git_dir(cwd) / f"review-prompt-{RUN_ID}.md"
    path.write_text(brief.read_text(encoding="utf-8", errors="replace") + note, encoding="utf-8")
    return path


def build_claude_command(claude_bin: str, args: argparse.Namespace, brief: Path) -> list[str]:
    # The prompt goes on stdin (never inline, as for Grok). The subject file sits
    # in the git directory, which for a worktree is outside the checkout: --add-dir
    # lets the read-only tools reach it. Highest effort, as for Grok.
    cmd = [claude_bin, *CLAUDE_REVIEW_FLAGS, "--add-dir", str(brief.parent), "--effort", "max"]
    if args.model:
        cmd += ["--model", args.model]
    return cmd


def windows_sandbox_mode(override: str | None = None) -> str:
    """Use the explicit mode, or read only [windows].sandbox from user config.

    This narrow parser also works on Python 3.9 without a TOML dependency. It
    accepts the section and quoted mode the reviewer recipe documents; any
    missing, ambiguous or unsupported spelling stops with an actionable message.
    """
    if override is not None:
        return override  # argparse validates the override before any config or CLI reads.
    config = Path(os.environ.get("CODEX_HOME") or (Path.home() / ".codex")) / "config.toml"
    hint = (f"[review.py] Windows Codex review requires a [windows] section with sandbox = \"elevated\" "
            f"or \"unelevated\" in {config}, or --windows-sandbox elevated|unelevated. "
            "Set that mode before rerunning; --ignore-user-config otherwise drops it and reads can be refused.")
    try:
        text = config.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as err:
        sys.exit(f"{hint}\n  Could not read the setting: {err}")
    # An example inside a multiline instruction string is not a config section.
    # Match comments and ordinary strings too, so quotes inside them cannot open one.
    text = re.sub(
        r'''\#[^\n]*|"""(?:\\.|(?!""").)*"""|\'\'\'.*?\'\'\'|"(?:\\.|[^"\\\n])*"|'[^'\n]*' ''',
        lambda m: "" if m.group().startswith(('"""', "'''")) else m.group(),
        text, flags=re.DOTALL | re.VERBOSE,
    )
    modes, in_windows, sections = [], False, 0
    for line in text.splitlines():
        if re.match(r"^\s*\[", line):
            in_windows = bool(re.fullmatch(r"\s*\[windows\]\s*(?:#.*)?", line))
            sections += int(in_windows)
        elif in_windows and re.match(r"^\s*sandbox\s*=", line):
            match = re.fullmatch(r"\s*sandbox\s*=\s*(['\"])(elevated|unelevated)\1\s*(?:#.*)?", line)
            if not match:
                sys.exit(hint)
            modes.append(match.group(2))
    if sections != 1 or len(modes) != 1:
        sys.exit(hint)
    return modes[0]


def build_codex_command(codex_bin: str, args: argparse.Namespace) -> list[str]:
    cmd = [codex_bin, *CODEX_REVIEW_FLAGS]
    if platform.system() == "Windows":
        cmd += ["-c", f'windows.sandbox="{windows_sandbox_mode(args.windows_sandbox)}"']
    if args.model:
        cmd += ["-m", args.model]
    return cmd + ["-c", f"model_reasoning_effort={args.effort}", "-C", str(args.cwd_resolved), "-"]


class CodexEvents:
    """Evidence from JSON objects, never from phrases in command output or reports."""

    def __init__(self, raw: str):
        self.parsed = self.skipped = self.succeeded = self.file_changes = self.completed_file_changes = 0
        self.report = ""
        self.has_report = False
        self.failed_commands: list[str] = []
        self.mcp_calls: list[str] = []
        self.outside_calls: list[str] = []
        self.listing_calls: list[str] = []
        self.refused_calls: list[str] = []
        self.web_searches: set[str] = set()
        self.unknown_items: set[str] = set()
        self.errors: list[str] = []
        self.turn_failed = self.turn_completed = False
        known = {"agent_message", "command_execution", "mcp_tool_call", "web_search",
                 "file_change", "error", "reasoning", "todo_list"}
        # StringIO iterates one line at a time, without splitting megabytes of command output.
        for line in io.StringIO(raw):
            try:
                event = json.loads(line)
            except ValueError:
                self.skipped += 1
                continue
            if not isinstance(event, dict):
                self.skipped += 1
                continue
            self.parsed += 1
            event_type = event.get("type")
            if event_type == "turn.failed":
                self.turn_failed = True
            elif event_type == "turn.completed":
                self.turn_completed = True
            if event_type in ("error", "turn.failed"):
                error = event.get("error")
                message = error.get("message") if isinstance(error, dict) else event.get("message")
                self.errors.append(str(message or event_type))
            if event_type not in ("item.started", "item.completed"):
                continue
            item = event.get("item")
            if not isinstance(item, dict):
                self.unknown_items.add("missing item object")
                continue
            kind = item.get("type")
            if not isinstance(kind, str) or kind not in known:
                self.unknown_items.add(str(kind))
            # A started search already violates isolation, even if it never completes.
            if kind == "web_search":
                self.web_searches.add(str(item.get("id") or item.get("query") or "unknown search"))
            if event_type != "item.completed":
                continue
            if kind == "agent_message" and isinstance(item.get("text"), str):
                self.report = item["text"]
                self.has_report = True
            elif kind == "command_execution":
                if item.get("status") == "completed" and item.get("exit_code") == 0:
                    self.succeeded += 1
                else:
                    command = str(item.get("command", "(command not recorded)"))
                    self.failed_commands.append(f"exit {item.get('exit_code')}, {item.get('status')}: {command}")
            elif kind == "mcp_tool_call":
                server, tool = item.get("server"), item.get("tool")
                label = f"{server}:{tool}"
                self.mcp_calls.append(label)
                if item.get("status") == "completed":
                    if server == "codex" and tool in ("list_mcp_resources", "list_mcp_resource_templates"):
                        self.listing_calls.append(label)
                    else:
                        self.outside_calls.append(label)
                elif item.get("status") == "failed":
                    self.refused_calls.append(label)
            elif kind == "file_change" and item.get("status") == "completed":
                self.completed_file_changes += 1
            elif kind == "error":
                error = item.get("error")
                message = error.get("message") if isinstance(error, dict) else item.get("message")
                self.errors.append(str(message or "error item without a message"))
            if kind == "file_change":
                self.file_changes += 1

    def failure(self) -> str:
        if not self.parsed:
            return "no JSON events parsed; there is no record that a Codex review ran."
        if not self.has_report:
            return "no agent_message event; Codex returned no review report."
        if self.outside_calls:
            return ("outside MCP tool completed: " + ", ".join(self.outside_calls)
                    + "; the review used a server the isolation flags did not exclude.")
        if self.web_searches:
            return "a web_search item appeared; the review reached outside the repository."
        if self.completed_file_changes:
            return "a file_change completed; the reviewer changed files during a read-only round."
        if not self.succeeded:
            return "no command succeeded; nothing was read through Codex's shell, so the review is unproved."
        # An error item can be a notice: Codex CLI 0.166.0 (observed 2026-11-14) warned that a
        # model's metadata was missing as an `error` item. Only a failed or unfinished turn fails.
        if self.turn_failed:
            return "a turn.failed event appeared despite exit 0; the round did not complete."
        if self.errors and not self.turn_completed:
            return "error events and no turn.completed event; the round cannot be accepted as completed."
        return ""


def finish_codex_round(raw: str, stderr: str, args: argparse.Namespace, elapsed: float,
                       returncode: int, timed_out: bool = False) -> None:
    events = CodexEvents(raw)
    summary = (f"[review.py] {len(events.report.strip())} chars in {elapsed:.0f}s; "
               f"Codex events: {events.parsed} parsed, {events.skipped} non-object/non-JSON lines skipped; "
               f"commands: {events.succeeded} succeeded, {len(events.failed_commands)} failed; "
               f"MCP calls: {len(events.mcp_calls)}; web searches: {len(events.web_searches)}; "
               f"file changes: {events.file_changes} ({events.completed_file_changes} completed)")
    if args.out:
        report_path = Path(args.out).expanduser()
        report_path.write_text(events.report, encoding="utf-8")
        summary += f"; report: {report_path}"
        if raw:
            event_path = Path(str(report_path) + ".events.jsonl")
            event_path.write_text(raw, encoding="utf-8")
            summary += f"; events: {event_path}"
    if events.skipped:
        summary += "; warning: skipped stdout lines are not review evidence"
    if events.listing_calls:
        summary += "; Codex's own listing tools (allowed): " + ", ".join(events.listing_calls)
    if events.outside_calls:
        summary += "; outside MCP tools completed: " + ", ".join(events.outside_calls)
    if events.unknown_items:
        summary += "; WARNING: unknown item types: " + ", ".join(sorted(events.unknown_items))
    sys.stderr.write(summary + "\n")
    if events.failed_commands:
        sys.stderr.write("[review.py] Failed commands (at most 20, each capped at 500 characters):\n")
        for command in events.failed_commands[:20]:
            sys.stderr.write("  " + command.replace("\n", " ").replace("\r", " ")[:500] + "\n")
        sys.stderr.write("  A search with no match or a refused write is normal; a failed read of a file under review is not.\n")
    for call in events.refused_calls:
        sys.stderr.write(f"[review.py] warning: MCP call {call} failed; the server reached the session, "
                         "and the next call might not be refused.\n")
    sys.stdout.write(events.report)
    if events.report and not events.report.endswith("\n"):
        sys.stdout.write("\n")
    for message in events.errors:
        sys.stderr.write(f"[review.py] Codex event error: {message}\n")
    if stderr:
        sys.stderr.write("[review.py] Codex stderr tail (at most 20 lines):\n"
                         + "\n".join(stderr.splitlines()[-20:]) + "\n")
    if timed_out:
        detail = "partial stdout was processed above" if raw else "no stdout was captured"
        sys.exit(f"[review.py] FAILED ROUND — round exceeded --timeout {args.timeout}s; "
                 f"{detail}; the review did not finish.")
    # --json usage-limit output was not observed on Codex CLI 0.166.0, 2026-11-14.
    # Only explicit event errors and stderr are eligible; repository prose is not.
    # Read only when the round did not complete, as for the other reviewers.
    if returncode or events.turn_failed or not events.turn_completed:
        out_of_usage("codex", *events.errors, stderr)
    if returncode:
        sys.stderr.write(f"[review.py] codex exited {returncode} after {elapsed:.0f}s\n")
        sys.exit(returncode)
    failure = events.failure()
    if failure:
        sys.stderr.write(f"[review.py] FAILED ROUND — {failure}\n")
        sys.exit(2)
    if len(events.report.strip()) < args.min_chars and not args.allow_short:
        sys.stderr.write(f"[review.py] FAILED ROUND — {len(events.report.strip())} chars is below "
                         f"--min-chars {args.min_chars}.\n"
                         "  A real round argues its conclusion over paragraphs. Accept a shorter round by hand only when its saved\n"
                         "  events (--out) show commands that printed the subject's content and the report names what it read.\n"
                         "  A rerun with --allow-short is a new, unchecked round.\n")
        sys.exit(2)
    if len(events.report.strip()) < args.min_chars:
        sys.stderr.write("[review.py] warning: short round accepted by --allow-short; "
                         "confirm it reasoned its way to a conclusion and could read the files.\n")


# Grok's own isolation, per process: its memory, its managed MCP configs and gateway tools, every Claude and
# Cursor compatibility cell (their instructions, rules, skills, hooks, MCP servers and session reading) and
# Codex's session reading. The environment wins over config.toml; measured with `grok inspect --json` on
# Grok 1.0.70, 2026-10-30: all 13 compatibility cells off, and the 19 entries they gated disabled.
GROK_ISOLATION = {"GROK_MEMORY": "0", "GROK_MANAGED_MCPS_ENABLED": "false",
                  "GROK_MANAGED_MCP_GATEWAY_TOOLS_ENABLED": "false", "GROK_CODEX_SESSIONS_ENABLED": "false",
                  **{f"GROK_{tool}_{cell}_ENABLED": "false" for tool in ("CLAUDE", "CURSOR")
                     for cell in ("AGENTS", "RULES", "SKILLS", "HOOKS", "MCPS", "SESSIONS")}}


def grok_still_on(grok_bin: str, cwd: str) -> str:
    """What a Grok run in `cwd` still loads with GROK_ISOLATION set, read from `grok inspect --json`:
    in a folder Grok trusts that includes the project's own instruction files, CLAUDE.local.md among them."""
    try:
        p = subprocess.run([grok_bin, "inspect", "--json"], cwd=cwd, env={**os.environ, **GROK_ISOLATION},
                           capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120)
        d = json.loads(p.stdout)
    except (OSError, ValueError, subprocess.TimeoutExpired) as e:
        return f"`grok inspect` failed ({e}): what the reviewer loads is unknown; say so in the round's report"
    if not isinstance(d, dict):
        return "`grok inspect` returned no object: what the reviewer loads is unknown; say so in the round's report"

    def on(key):
        return [x for x in d.get(key) or [] if isinstance(x, dict) and x.get("compatibilityStatus") != "disabled"]

    def label(x):
        src = x.get("source") if isinstance(x.get("source"), dict) else {}
        if "target" in x:  # a hook: its event and source only; its command or URL can carry a token
            return f"{x.get('event') or 'hook'} ({src.get('plugin_name') or src.get('type') or '?'})"
        return str(x.get("path") or x.get("name") or src.get("path") or src.get("plugin_name") or "?")

    skills = on("skills")
    bundled = sum(1 for s in skills if (s.get("source") or {}).get("type") == "bundled")
    parts = [f"{k}: {', '.join(label(x) for x in on(k)) or 'none'}" for k in ("projectInstructions", "hooks",
                                                                       "plugins", "mcpServers")]
    parts.append(f"skills: {bundled} bundled, others: "
                 f"{', '.join(label(s) for s in skills if (s.get('source') or {}).get('type') != 'bundled') or 'none'}")
    return ("still on for this run, from `grok inspect` (name them in the round's report; MCP calls stay denied): "
            + "; ".join(parts))


def build_command(grok_bin: str, args: argparse.Namespace, brief: Path) -> list[str]:
    cmd = [grok_bin, "--prompt-file", str(brief), "--cwd", str(args.cwd_resolved)]
    cmd += REVIEW_FLAGS
    cmd += ["--max-turns", str(args.max_turns)]
    if args.effort:
        cmd += ["--reasoning-effort", args.effort]
    if args.sandbox:
        cmd += ["--sandbox", args.sandbox]
    if args.model:
        cmd += ["--model", args.model]
    return cmd


def out_of_usage(reviewer: str, *texts: str) -> None:
    """Exit 3, with the rerun, when the reviewer's account is out of usage: the round never ran."""
    hit = next((m for t in texts if t for m in [OUT_OF_USAGE.search(t)] if m), None)
    if not hit:
        return
    sys.stderr.write(f"[review.py] {reviewer} answered that its account is out of usage "
                     f"({hit.group(0)!r}): the round did not run, so it is not a clean round.\n")
    rest, skip = [], False
    for a in sys.argv[1:]:
        if skip:
            skip = False
            continue
        key = a.split("=", 1)[0]
        # Drop argparse's unambiguous abbreviations too; model names do not carry between CLIs.
        if len(key) > 2 and ("--reviewer".startswith(key) or "--model".startswith(key)):
            skip = "=" not in a
            continue
        rest.append(a)
    candidates = {"grok": ("codex", "claude"), "codex": ("claude", "grok"), "claude": ("grok", "codex")}
    finders = {"grok": find_grok_bin, "codex": find_codex_bin, "claude": find_claude_bin}
    other = None
    for candidate in candidates[reviewer]:
        try:
            binary = finders[candidate]()
        except SystemExit as err:
            sys.stderr.write(f"  Cannot use {candidate}: {err}\n")
            continue
        if binary:
            other = candidate
            break
    rerun = ["python", sys.argv[0], *rest]
    if other:
        rerun += ["--reviewer", other]
        next_step = f"Rerun the round with the next installed reviewer, {other}, in a fresh read-only session:"
    else:
        rerun += ["--subject-only"]
        next_step = ("No next reviewer CLI is installed. Write the prompt with --subject-only "
                     "(requires --brief, --cwd and --subject), then start a fresh read-only process:")
    sys.stderr.write(
        f"  {next_step}\n"
        f"    {shlex.join(rerun)} < /dev/null\n"
        "  Add --model when the repository's instructions name the fallback's model. Run their recorded "
        "fallback if it can, otherwise the next available reviewer or the --subject-only manual route, without asking. "
        "A repository ranks its "
        "reviewers; it cannot rule out a review. If no other family can run, use a fresh session of the "
        "builder's own family, never the building session and never no review. Record the actual "
        "reviewer and why in the round's report.\n"
    )
    sys.exit(3)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Runs one unsteered independent review round: Grok, fresh Codex, or fresh Claude Code. "
        "Codex's events must prove successful shell commands and no completed outside MCP calls, web searches or completed file changes.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("Usage:", 1)[1] if __doc__ else "",
    )
    parser.add_argument("--brief", metavar="FILE", help="Review brief. A FILE, never inline.")
    parser.add_argument("--cwd", metavar="DIR", help="Repo the round runs against. Mandatory.")
    parser.add_argument(
        "--effort",
        metavar="LEVEL",
        choices=["low", "medium", "high", "xhigh"],
        default="xhigh",
        help="Grok/Codex reasoning effort (default: xhigh); Claude Code always uses max",
    )
    parser.add_argument("--max-turns", type=int, default=60, metavar="N",
                        help="Grok turn cap (default: 60); Codex has no turn cap, so this does not apply")
    parser.add_argument(
        "--model",
        metavar="MODEL",
        help="Override the model (default: the CLI's). Codex passes this as -m; user config, "
        "including its model choice, is ignored, so pass the model the user confirmed. "
        "`grok models` lists Grok's.",
    )
    parser.add_argument(
        "--subject",
        metavar="RANGE",
        help="Git range under review (e.g. origin/PROD..HEAD, or abc123^! for one commit). "
        "Written to a file every reviewer can read, including those without a shell.",
    )
    parser.add_argument("--net", action="store_true",
                        help="With an A..B or <sha>^! --subject: the one-line log and the range's cumulative "
                        "diff instead of each commit's patch, for a range that wrote and later removed code")
    parser.add_argument("--exclude", action="append", default=[], metavar="GLOB",
                        help="With --subject: leave paths matching this repository-root glob out of the "
                        "subject, such as working notes (repeatable)")
    parser.add_argument("--sandbox", metavar="PROFILE",
                        help="Grok sandbox profile passthrough; its tool allowlist is the write boundary "
                        "(sandbox enforcement varies by platform). Codex always uses read-only.")
    parser.add_argument("--windows-sandbox", choices=["elevated", "unelevated"],
                        help="Windows Codex sandbox mode; overrides [windows].sandbox in user config "
                        "(default: read the configured mode). Codex still uses read-only.")
    parser.add_argument("--out", metavar="FILE", help="Also write the report to FILE; "
                        "Codex raw events go to FILE.events.jsonl, including partial output on failure")
    parser.add_argument(
        "--min-chars",
        type=int,
        default=DEFAULT_MIN_CHARS,
        metavar="N",
        help=f"Below this, the round is treated as FAILED (default: {DEFAULT_MIN_CHARS})",
    )
    parser.add_argument(
        "--allow-short",
        action="store_true",
        help="Accept a short round anyway. Only after reading it and confirming "
        "it genuinely reasoned its way to empty. Does not waive Codex's event checks.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=3600,
        metavar="SEC",
        help="Hard cap on the round (default: 3600)",
    )
    parser.add_argument(
        "--reviewer",
        choices=["auto", "codex", "claude", "grok"],
        default="auto",
        help="auto (default): first installed of Codex, Claude Code, Grok; all fresh and read-only",
    )
    parser.add_argument("--check", action="store_true",
                        help="Say which reviewer a round would use and verify its flags "
                        "(Codex also checks feature names and administrator-file existence); run no round")
    parser.add_argument("--dry-run", action="store_true", help="Print the command, run nothing")
    parser.add_argument("--subject-only", action="store_true",
                        help="Write the subject and the prompt, print their paths and run nothing, "
                        "for a round run by hand when none of the three CLIs is installed")
    args = parser.parse_args()
    if args.subject is not None and (not args.subject.strip() or args.subject.startswith("..")):
        sys.exit(f"[review.py] --subject {args.subject!r} is empty, or has no start (which git "
                 "reads as HEAD), so it holds no commits: usually a substitution that came back empty, such as "
                 "`git describe --tags` where no tag is reachable from HEAD. Name the last release (a "
                 "missing tag is not proof that nothing is released: a production branch or the deployed "
                 "commit may say, and where nothing does, ask the owner), or before the first "
                 f"release:{product_start(Path(args.cwd or '.'))}")
    if (args.net or args.exclude) and not args.subject:
        sys.exit("[review.py] --net and --exclude take a --subject")
    if args.subject_only and (args.check or args.dry_run or not args.subject):
        sys.exit("[review.py] --subject-only takes --brief, --cwd and --subject, and runs no reviewer")

    reviewer, binary = ("", "") if args.subject_only else pick_reviewer(args.reviewer)
    grok_flags = ["--prompt-file", "--cwd", "--always-approve", "--tools", "--disallowed-tools",
                  "--deny", "--disable-web-search", "--max-turns"]
    claude_flags = ["--restricted", "--tools", "--strict-mcp-config", "--no-session-persistence", "--add-dir",
                    "--effort", "--output-format"]
    # Check long spellings advertised by `codex exec --help`, including -s/-m/-c/-C.
    codex_flags = ["--json", "--disable", "--ephemeral", "--ignore-user-config", "--ignore-rules",
                   "--sandbox", "--model", "--config", "--cd"]
    required = {"grok": grok_flags, "codex": codex_flags, "claude": claude_flags}

    if args.check:
        print(f"reviewer: {reviewer} ({binary})")
        have = supported_flags(binary, reviewer)
        if reviewer == "claude":
            print("  a fresh Claude Code session reviews, read-only, with no settings, "
                  "hooks, plugins, MCP servers, auto-memory or saved session")
        if reviewer == "codex":
            print("  " + CODEX_ISOLATION)
            warn_codex_administrator_files()
            if platform.system() == "Windows":
                source = "from --windows-sandbox" if args.windows_sandbox else "restored from user config"
                print(f"  Windows sandbox mode {source}: {windows_sandbox_mode(args.windows_sandbox)}")
            args.cwd_resolved = Path(args.cwd or os.getcwd()).expanduser().resolve()
            print("  command: " + shlex.join(build_codex_command(binary, args)))
        if reviewer == "grok":
            print("  memory, managed MCP servers, and Claude, Cursor and Codex compatibility off for the run; "
                  + grok_still_on(binary, args.cwd or os.getcwd()))
        wanted = (grok_flags + ["--reasoning-effort", "--sandbox", "--model"] if reviewer == "grok"
                  else claude_flags + ["--model"] if reviewer == "claude" else codex_flags)
        for flag in wanted:
            print(f"  {flag:<24} {'ok' if flag in have else 'MISSING'}")
        missing_features = missing_codex_features(binary) if reviewer == "codex" else []
        for feature in CODEX_DISABLED_FEATURES if reviewer == "codex" else ():
            problem = next((message for message in missing_features if message.startswith(f"--disable {feature}:")), None)
            print(f"  --disable {feature:<16} " + (f"MISSING: {problem}" if problem else "ok"))
        if missing_features or any(flag not in have for flag in wanted):
            sys.exit(1)
        return

    if not args.brief:
        parser.error("--brief FILE is required (the brief goes in a file, never inline)")
    if not args.cwd:
        parser.error("--cwd DIR is required (without it the round runs in the session's directory)")

    brief = Path(args.brief).expanduser()
    if not brief.is_file():
        sys.exit(f"[review.py] --brief is not a file: {args.brief}")
    brief = brief.resolve()

    cwd = Path(args.cwd).expanduser()
    if not cwd.is_dir():
        sys.exit(f"[review.py] --cwd is not a directory: {args.cwd}")
    # The subject's paths are rooted at the checkout's top level, and a reviewer confined
    # to a subdirectory couldn't open the files around the change, so the round runs there.
    top = subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=str(cwd), capture_output=True,
                         text=True, encoding="utf-8", errors="replace").stdout.strip()
    args.cwd_resolved = Path(top).resolve() if top else cwd.resolve()

    brief_text = brief.read_text(encoding="utf-8", errors="replace")
    if len(brief_text.strip()) < THIN_BRIEF_CHARS:
        sys.stderr.write(
            f"[review.py] warning: brief is {len(brief_text.strip())} chars. "
            "A brief carries the goal, the constraints that bind, and how to "
            "prove it — a thin one gets you a locally-correct answer to the "
            "wrong question.\n"
        )

    if not args.subject_only:
        require_flags(binary, required[reviewer], reviewer)
        if reviewer == "codex":
            warn_codex_administrator_files()
            missing_features = missing_codex_features(binary)
            if missing_features:
                sys.exit("[review.py] MISSING Codex isolation feature(s):\n  " + "\n  ".join(missing_features))

    if not args.subject:
        sys.stderr.write("[review.py] warning: no --subject. No git range was prepared; "
                         "the prompt asks the reviewer to read only the working tree.\n")
    subject, lines = (write_subject(args.cwd_resolved, args.subject, args.net, tuple(args.exclude))
                      if args.subject else (None, 0))
    prompt = compose_prompt(args.cwd_resolved, brief, subject, lines)
    if args.subject_only:
        print(f"subject: {subject} ({lines} lines)\nprompt:  {prompt}")
        return
    # Paging the subject costs a turn per READ_FILE_LINES lines; leave room on top
    # to read the repository and write the review, so a large range can't run out
    # of turns before the review starts.
    if subject and reviewer == "grok":
        needed = lines // READ_FILE_LINES + 1 + 40
        if args.max_turns < needed:
            sys.stderr.write(f"[review.py] --max-turns raised to {needed} for a "
                             f"{lines}-line subject\n")
            args.max_turns = needed
    if reviewer == "grok":
        cmd = build_command(binary, args, prompt)
        stdin, env = "", {**os.environ, **GROK_ISOLATION}
    elif reviewer == "codex":
        cmd = build_codex_command(binary, args)
        stdin, env = prompt.read_text(encoding="utf-8"), os.environ.copy()
    else:
        cmd = build_claude_command(binary, args, prompt)
        stdin = prompt.read_text(encoding="utf-8")
        env = {**os.environ, "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1"}
        env.pop("CLAUDE_CODE_EFFORT_LEVEL", None)  # it overrides --effort and would lower the round

    if args.dry_run:
        print(" ".join(cmd) + ("" if reviewer == "grok" else f" < {prompt}"))
        return

    for f in (prompt, subject):
        if f:
            atexit.register(f.unlink, missing_ok=True)
    sys.stderr.write(f"[review.py] {brief.name} -> {args.cwd_resolved} ({reviewer})\n")
    if reviewer == "grok":
        sys.stderr.write(f"[review.py] {grok_still_on(binary, str(args.cwd_resolved))}\n")
    elif reviewer == "codex":
        sys.stderr.write(f"[review.py] {CODEX_ISOLATION}\n")
    started = time.time()
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            input=stdin,
            cwd=str(args.cwd_resolved),
            env=env,
            timeout=args.timeout,
        )
    except subprocess.TimeoutExpired as err:
        if reviewer == "codex":
            raw = err.stdout.decode("utf-8", "replace") if isinstance(err.stdout, bytes) else (err.stdout or "")
            stderr = err.stderr.decode("utf-8", "replace") if isinstance(err.stderr, bytes) else (err.stderr or "")
            finish_codex_round(raw, stderr, args, time.time() - started, 1, timed_out=True)
        sys.exit(f"[review.py] round exceeded --timeout {args.timeout}s. Nothing to read.")
    except OSError as err:
        sys.exit(f"[review.py] could not start {reviewer}: {err}. The round did not run.")

    elapsed = time.time() - started
    if reviewer == "codex":
        finish_codex_round(proc.stdout or "", proc.stderr or "", args, elapsed, proc.returncode)
        return
    out = proc.stdout or ""
    body = out.strip()

    if args.out:
        Path(args.out).expanduser().write_text(out, encoding="utf-8")

    stderr = proc.stderr or ""
    usage_text = stderr

    if proc.returncode != 0:
        sys.stderr.write(f"[review.py] {reviewer} exited {proc.returncode} after {elapsed:.0f}s\n")
        if stderr:
            sys.stderr.write(stderr)
        sys.stdout.write(out)
        out_of_usage(reviewer, out, usage_text)
        sys.exit(proc.returncode)

    sys.stdout.write(out)
    if out and not out.endswith("\n"):
        sys.stdout.write("\n")

    summary = f"[review.py] {len(body)} chars in {elapsed:.0f}s"
    if args.out:
        summary += f", written to {args.out}"

    if len(body) < args.min_chars:
        out_of_usage(reviewer, out, usage_text)

    if len(body) < args.min_chars and not args.allow_short:
        sys.stderr.write(summary + "\n")
        if stderr:
            sys.stderr.write(stderr)
        sys.stderr.write(
            f"[review.py] FAILED ROUND — {len(body)} chars is below "
            f"--min-chars {args.min_chars}.\n"
            "  This is the 2026-09-08 failure: exit 0, a short preamble, and it "
            "reads as a clean round.\n"
            "  A round that genuinely found nothing still argues its way there "
            "over paragraphs.\n"
            "  This reviewer saves no events to check by hand, so run a fresh round.\n"
            "  A rerun with --allow-short is a new, unchecked round.\n"
        )
        sys.exit(2)

    if len(body) < args.min_chars:
        sys.stderr.write("[review.py] warning: short round accepted by --allow-short; "
                         "confirm it reasoned its way to a conclusion and could read the files.\n")
    sys.stderr.write(summary + "\n")


if __name__ == "__main__":
    main()
