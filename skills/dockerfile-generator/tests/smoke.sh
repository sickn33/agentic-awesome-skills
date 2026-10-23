#!/usr/bin/env bash
# Self-contained smoke suite for the dockerfile-generator skill.
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-python3}"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/dfg-skill-smoke.XXXXXX")"
export PYTHONDONTWRITEBYTECODE=1

# Ignored bytecode caches from earlier runs are not part of the package. Remove
# them so the hygiene checks at the end test this run, not stale state.
find "$ROOT/vendor" -type d -name '__pycache__' -prune -exec rm -rf {} + 2>/dev/null || true
find "$ROOT/vendor" -type f \( -name '*.pyc' -o -name '*.pyo' \) -delete 2>/dev/null || true

PASS=0
FAIL=0
LOG_N=0
LAST_LOG=""

cleanup() {
    if [ "${SMOKE_KEEP:-0}" = "1" ]; then
        printf 'Smoke workspace kept: %s\n' "$TMP"
    else
        rm -rf "$TMP"
    fi
}
trap cleanup EXIT

pass() {
    PASS=$((PASS + 1))
    printf 'ok - %s\n' "$1"
}

fail() {
    FAIL=$((FAIL + 1))
    printf 'not ok - %s\n' "$1"
    shift || true
    if [ "$#" -gt 0 ]; then
        printf '  %s\n' "$*"
    fi
}

run_ok() {
    local name="$1"
    shift
    LOG_N=$((LOG_N + 1))
    LAST_LOG="$TMP/log-$LOG_N.txt"
    if "$@" >"$LAST_LOG" 2>&1; then
        pass "$name"
    else
        fail "$name"
        sed -n '1,120p' "$LAST_LOG" | sed 's/^/    /'
    fi
}

run_fail() {
    local name="$1"
    shift
    LOG_N=$((LOG_N + 1))
    LAST_LOG="$TMP/log-$LOG_N.txt"
    if "$@" >"$LAST_LOG" 2>&1; then
        fail "$name" "command unexpectedly succeeded: $*"
    else
        pass "$name"
    fi
}

assert_file() {
    if [ -f "$1" ]; then
        pass "$2"
    else
        fail "$2" "missing file: $1"
    fi
}

assert_any_file() {
    local name="$1"
    shift
    local file
    for file in "$@"; do
        if [ -f "$file" ]; then
            pass "$name"
            return 0
        fi
    done
    fail "$name" "none of these files exist: $*"
}

assert_not_exists() {
    if [ ! -e "$1" ]; then
        pass "$2"
    else
        fail "$2" "unexpected file: $1"
    fi
}

assert_exec() {
    if [ -x "$1" ]; then
        pass "$2"
    else
        fail "$2" "not executable: $1"
    fi
}

assert_contains() {
    if grep -Fq -- "$2" "$1" 2>/dev/null; then
        pass "$3"
    else
        fail "$3" "expected '$2' in $1"
        sed -n '1,80p' "$1" 2>/dev/null | sed 's/^/    /'
    fi
}

assert_not_contains() {
    if grep -Fq -- "$2" "$1" 2>/dev/null; then
        fail "$3" "unexpected '$2' in $1"
    else
        pass "$3"
    fi
}

assert_symlink() {
    if [ -L "$1" ]; then
        pass "$2"
    else
        fail "$2" "not a symlink: $1"
    fi
}

make_python() {
    local dir="$1"
    mkdir -p "$dir"
    cat >"$dir/requirements.txt" <<'EOF'
fastapi==0.115.0
uvicorn==0.30.0
EOF
    cat >"$dir/main.py" <<'EOF'
from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health():
    return {"ok": True}
EOF
}

make_go() {
    local dir="$1"
    mkdir -p "$dir"
    cat >"$dir/go.mod" <<'EOF'
module example.com/demo

go 1.22
EOF
    cat >"$dir/main.go" <<'EOF'
package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "ok")
	})
	http.ListenAndServe(":8080", nil)
}
EOF
}

make_node() {
    local dir="$1"
    mkdir -p "$dir"
    cat >"$dir/package.json" <<'EOF'
{
  "name": "demo",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "express": "^4.19.2"
  }
}
EOF
    cat >"$dir/index.js" <<'EOF'
const express = require('express');
const app = express();
app.get('/health', (req, res) => res.send('ok'));
app.listen(3000);
EOF
}

make_rust() {
    local dir="$1"
    mkdir -p "$dir/src"
    cat >"$dir/Cargo.toml" <<'EOF'
[package]
name = "demo"
version = "0.1.0"
edition = "2021"
EOF
    cat >"$dir/src/main.rs" <<'EOF'
fn main() {
    println!("ok");
}
EOF
}

make_java() {
    local dir="$1"
    mkdir -p "$dir/src/main/java/com/example"
    cat >"$dir/pom.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>demo</artifactId>
  <version>1.0.0</version>
  <properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
  </properties>
</project>
EOF
    cat >"$dir/src/main/java/com/example/App.java" <<'EOF'
package com.example;

public class App {
    public static void main(String[] args) {
        System.out.println("ok");
    }
}
EOF
}

printf '# dockerfile-generator smoke suite\n'
printf 'skill: %s\n' "$ROOT"

# ---------------------------------------------------------------------------
# Static checks
# ---------------------------------------------------------------------------

if [ -f "$ROOT/SKILL.md" ]; then
    pass "SKILL.md exists"
else
    fail "SKILL.md exists"
fi
assert_file "$ROOT/README.md" "README.md exists"
assert_file "$ROOT/LICENSE" "LICENSE exists"
assert_file "$ROOT/NOTICE" "NOTICE exists"
assert_file "$ROOT/requirements.txt" "requirements.txt exists"
assert_file "$ROOT/vendor/create-dockerfile.sh" "vendored wrapper exists"
assert_file "$ROOT/vendor/legacy/create-dockerfile-legacy.sh" "vendored legacy renderer exists"
assert_file "$ROOT/vendor/config/defaults.yaml" "vendored defaults exist"
assert_file "$ROOT/vendor/UPSTREAM.txt" "vendor provenance exists"
assert_exec "$ROOT/scripts/generate.sh" "generate.sh is executable"
assert_exec "$ROOT/scripts/install.sh" "install.sh is executable"
assert_exec "$ROOT/tests/smoke.sh" "smoke.sh is executable"

FRONTMATTER_OK=0
if command -v "$PYTHON" >/dev/null 2>&1; then
    if "$PYTHON" - "$ROOT/SKILL.md" <<'PY'
import sys

import yaml

path = sys.argv[1]
text = open(path, encoding="utf-8").read()
if not text.startswith("---\n"):
    raise SystemExit("SKILL.md must start with YAML frontmatter")
parts = text.split("---\n", 2)
if len(parts) != 3:
    raise SystemExit("unterminated YAML frontmatter")
data = yaml.safe_load(parts[1])
if not isinstance(data, dict):
    raise SystemExit("frontmatter is not a mapping")
if data.get("name") != "dockerfile-generator":
    raise SystemExit(f"unexpected name: {data.get('name')!r}")
description = data.get("description", "")
if not isinstance(description, str) or not description.strip():
    raise SystemExit("description is required")
if len(description) > 1024:
    raise SystemExit("description is longer than 1024 characters")
if data.get("license") != "MIT":
    raise SystemExit("license must be MIT")
metadata = data.get("metadata") or {}
if metadata.get("upstream-commit") != "2c0fbaf":
    raise SystemExit("unexpected upstream commit")
if not parts[2].strip():
    raise SystemExit("SKILL.md body is empty")
PY
    then
        FRONTMATTER_OK=1
        pass "SKILL.md frontmatter is valid"
    else
        fail "SKILL.md frontmatter is valid"
    fi
else
    fail "SKILL.md frontmatter is valid" "python3 is not available"
fi

SYNTAX_OK=0
while IFS= read -r script; do
    if ! bash -n "$script"; then
        SYNTAX_OK=1
    fi
done < <(find "$ROOT" -type f -name '*.sh' | sort)
if [ "$SYNTAX_OK" -eq 0 ]; then
    pass "all shell scripts parse with bash -n"
else
    fail "all shell scripts parse with bash -n"
fi

if command -v "$PYTHON" >/dev/null 2>&1; then
    if "$PYTHON" - "$ROOT/vendor" <<'PY'
import ast
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
for path in sorted(root.rglob("*.py")):
    ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
PY
    then
        pass "all vendored Python files parse"
    else
        fail "all vendored Python files parse"
    fi
else
    fail "all vendored Python files parse" "python3 is not available"
fi

if command -v "$PYTHON" >/dev/null 2>&1; then
    run_ok "vendored package imports" env PYTHONPATH="$ROOT/vendor" "$PYTHON" -m docker_file_generator --help
else
    fail "vendored package imports" "python3 is not available"
fi

if [ "$FRONTMATTER_OK" -eq 1 ]; then
    run_ok "generate.sh --help" bash "$ROOT/scripts/generate.sh" --help
    run_ok "generate.sh --version" bash "$ROOT/scripts/generate.sh" --version
    run_ok "generate.sh --check-deps" bash "$ROOT/scripts/generate.sh" --check-deps
    run_ok "generate.sh --upstream-help" bash "$ROOT/scripts/generate.sh" --upstream-help
fi

run_ok "install.sh --list" bash "$ROOT/scripts/install.sh" --list
assert_contains "$LAST_LOG" "claude" "installer list includes Claude Code"
assert_contains "$LAST_LOG" "copilot" "installer list includes GitHub Copilot"
assert_contains "$LAST_LOG" "antigravity" "installer list includes Antigravity"
assert_contains "$LAST_LOG" "devin" "installer list includes Devin Desktop"
assert_contains "$LAST_LOG" "kiro" "installer list includes Kiro"

# ---------------------------------------------------------------------------
# Language fixtures
# ---------------------------------------------------------------------------

PY_FIX="$TMP/fixtures/python"
make_python "$PY_FIX"
run_ok "python: Dockerfile-1 generation" bash "$ROOT/scripts/generate.sh" \
    --project "$PY_FIX" --no-dockerfile-2 --fast
assert_file "$PY_FIX/Dockerfile-1" "python: Dockerfile-1 written"
assert_any_file "python: dockerignore written" "$PY_FIX/.dockerignore" "$PY_FIX/.dockerignore-1"
assert_contains "$PY_FIX/Dockerfile-1" "FROM python" "python: Python base image selected"
assert_not_exists "$PY_FIX/Dockerfile-2" "python: --no-dockerfile-2 omits Dockerfile-2"

GO_FIX="$TMP/fixtures/go"
make_go "$GO_FIX"
run_ok "go: Dockerfile-1 generation" bash "$ROOT/scripts/generate.sh" \
    --project "$GO_FIX" --no-dockerfile-2 --fast
assert_file "$GO_FIX/Dockerfile-1" "go: Dockerfile-1 written"
assert_contains "$GO_FIX/Dockerfile-1" "FROM golang" "go: Go builder image selected"

NODE_FIX="$TMP/fixtures/node"
make_node "$NODE_FIX"
run_ok "node: Dockerfile-1 generation" bash "$ROOT/scripts/generate.sh" \
    --project "$NODE_FIX" --no-dockerfile-2 --fast
assert_file "$NODE_FIX/Dockerfile-1" "node: Dockerfile-1 written"
assert_contains "$NODE_FIX/Dockerfile-1" "FROM node" "node: Node base image selected"

RUST_FIX="$TMP/fixtures/rust"
make_rust "$RUST_FIX"
run_ok "rust: Dockerfile-1 generation" bash "$ROOT/scripts/generate.sh" \
    --project "$RUST_FIX" --no-dockerfile-2 --fast
assert_file "$RUST_FIX/Dockerfile-1" "rust: Dockerfile-1 written"
assert_contains "$RUST_FIX/Dockerfile-1" "FROM rust" "rust: Rust builder image selected"

JAVA_FIX="$TMP/fixtures/java"
make_java "$JAVA_FIX"
run_ok "java: Dockerfile-1 generation" bash "$ROOT/scripts/generate.sh" \
    --project "$JAVA_FIX" --no-dockerfile-2 --fast
assert_file "$JAVA_FIX/Dockerfile-1" "java: Dockerfile-1 written"
assert_contains "$JAVA_FIX/Dockerfile-1" "FROM " "java: a base image is selected"

# ---------------------------------------------------------------------------
# Configuration and monorepo modes
# ---------------------------------------------------------------------------

CONFIG_FIX="$TMP/fixtures/config"
make_python "$CONFIG_FIX"
cat >"$CONFIG_FIX/custom.yaml" <<'EOF'
defaults:
  port: 9999
EOF
run_ok "config print without writing" bash "$ROOT/scripts/generate.sh" \
    --project "$CONFIG_FIX" --no-dockerfile-2 --fast \
    --config custom.yaml --print-config
assert_contains "$LAST_LOG" '9999' "config override reaches resolved output"
assert_not_exists "$CONFIG_FIX/Dockerfile-1" "config print writes no Dockerfile-1"

MONO_FIX="$TMP/fixtures/mono"
mkdir -p "$MONO_FIX/frontend" "$MONO_FIX/backend"
make_node "$MONO_FIX/frontend"
make_python "$MONO_FIX/backend"
run_ok "monorepo --all" bash "$ROOT/scripts/generate.sh" \
    --project "$MONO_FIX" --all --fast
assert_file "$MONO_FIX/frontend.Dockerfile-1" "monorepo: frontend Dockerfile written"
assert_file "$MONO_FIX/backend.Dockerfile-1" "monorepo: backend Dockerfile written"

# ---------------------------------------------------------------------------
# Modes and path handling
# ---------------------------------------------------------------------------

DRY_FIX="$TMP/fixtures/dryrun"
make_python "$DRY_FIX"
run_ok "dry-run succeeds" bash "$ROOT/scripts/generate.sh" \
    --project "$DRY_FIX" --no-dockerfile-2 --fast --dry-run
assert_not_exists "$DRY_FIX/Dockerfile-1" "dry-run writes no Dockerfile-1"
assert_not_exists "$DRY_FIX/Dockerfile-2" "dry-run writes no Dockerfile-2"

run_ok "check existing Dockerfile-1" bash "$ROOT/scripts/generate.sh" \
    --project "$PY_FIX" --check
assert_contains "$LAST_LOG" "PASS" "check reports PASS"

COMPOSE_FIX="$TMP/fixtures/compose"
make_node "$COMPOSE_FIX"
run_ok "compose generation" bash "$ROOT/scripts/generate.sh" \
    --project "$COMPOSE_FIX" --compose --fast
assert_file "$COMPOSE_FIX/compose.yaml" "compose: compose.yaml written"
assert_file "$COMPOSE_FIX/Dockerfile-1" "compose: Dockerfile-1 written"

SPACE_FIX="$TMP/fixtures/space project"
make_python "$SPACE_FIX"
run_ok "path with spaces" bash "$ROOT/scripts/generate.sh" \
    --project "$SPACE_FIX" --no-dockerfile-2 --fast
assert_file "$SPACE_FIX/Dockerfile-1" "path with spaces: Dockerfile-1 written"

run_ok "double-dash project path" bash "$ROOT/scripts/generate.sh" \
    -- "$SPACE_FIX" --no-dockerfile-2 --fast --dry-run
assert_contains "$LAST_LOG" "PASS" "double-dash project path reports PASS"

run_fail "double-dash missing project rejected" bash "$ROOT/scripts/generate.sh" \
    -- "$TMP/fixtures/does-not-exist" --dry-run
assert_contains "$LAST_LOG" "not a directory" "double-dash missing project error is clear"

run_fail "missing project rejected" bash "$ROOT/scripts/generate.sh" \
    --project "$TMP/fixtures/does-not-exist" --dry-run
assert_contains "$LAST_LOG" "not a directory" "missing project error is clear"

run_fail "check and dry-run rejected" bash "$ROOT/scripts/generate.sh" \
    --project "$PY_FIX" --check --dry-run
assert_contains "$LAST_LOG" "cannot be used together" "check/dry-run conflict is clear"

# ---------------------------------------------------------------------------
# Installer behavior
# ---------------------------------------------------------------------------

INSTALL_ROOT="$TMP/install-project"
mkdir -p "$INSTALL_ROOT"
run_ok "installer all/platform dry-run" bash "$ROOT/scripts/install.sh" \
    --platform all --scope project --project-root "$INSTALL_ROOT" --dry-run
assert_contains "$LAST_LOG" ".opencode/skills" "installer includes OpenCode path"
assert_contains "$LAST_LOG" ".claude/skills" "installer includes Claude Code path"
assert_contains "$LAST_LOG" ".agents/skills" "installer includes agents path"
assert_contains "$LAST_LOG" ".github/skills" "installer includes Copilot path"
assert_contains "$LAST_LOG" ".devin/skills" "installer includes Devin path"
assert_contains "$LAST_LOG" ".cline/skills" "installer includes Cline path"
assert_contains "$LAST_LOG" ".kiro/skills" "installer includes Kiro path"

GLOBAL_HOME="$TMP/global-home"
mkdir -p "$GLOBAL_HOME"
run_ok "installer global dry-run" env HOME="$GLOBAL_HOME" bash "$ROOT/scripts/install.sh" \
    --platform all --scope global --dry-run
assert_contains "$LAST_LOG" ".config/opencode/skills" "global installer includes OpenCode path"
assert_contains "$LAST_LOG" ".claude/skills" "global installer includes Claude Code path"
assert_contains "$LAST_LOG" ".agents/skills" "global installer includes agents path"
assert_contains "$LAST_LOG" ".gemini/config/skills" "global installer includes Antigravity path"
assert_contains "$LAST_LOG" ".codeium/windsurf/skills" "global installer includes Devin path"
assert_contains "$LAST_LOG" ".cline/skills" "global installer includes Cline path"
assert_contains "$LAST_LOG" ".kiro/skills" "global installer includes Kiro path"
assert_not_contains "$LAST_LOG" ".github/skills" "global installer skips Copilot"

ALL_PROJECT="$TMP/install-all-project"
mkdir -p "$ALL_PROJECT"
run_ok "installer all/platform project" bash "$ROOT/scripts/install.sh" \
    --platform all --scope project --project-root "$ALL_PROJECT"
for rel in .opencode .claude .agents .cursor .github .devin .cline .kiro; do
    assert_file "$ALL_PROJECT/$rel/skills/dockerfile-generator/SKILL.md" \
        "all/project installed $rel"
done
if [ "$(find "$ALL_PROJECT" -type d -name dockerfile-generator | wc -l)" -eq 8 ]; then
    pass "all/project installs exactly eight unique destinations"
else
    fail "all/project installs exactly eight unique destinations"
fi

CLAUDE_DEST="$TMP/install/claude/dockerfile-generator"
run_ok "installer copies for Claude Code" bash "$ROOT/scripts/install.sh" \
    --platform claude --target "$CLAUDE_DEST"
assert_file "$CLAUDE_DEST/SKILL.md" "installed SKILL.md exists"
assert_exec "$CLAUDE_DEST/scripts/generate.sh" "installed generate.sh is executable"
assert_file "$CLAUDE_DEST/vendor/create-dockerfile.sh" "installed vendor runtime exists"
assert_not_exists "$CLAUDE_DEST/.git" "installed copy excludes .git"

INSTALLED_FIX="$TMP/fixtures/installed"
make_python "$INSTALLED_FIX"
run_ok "installed skill generates" bash "$CLAUDE_DEST/scripts/generate.sh" \
    --project "$INSTALLED_FIX" --no-dockerfile-2 --fast
assert_file "$INSTALLED_FIX/Dockerfile-1" "installed skill wrote Dockerfile-1"

run_fail "installer refuses overwrite" bash "$ROOT/scripts/install.sh" \
    --platform claude --target "$CLAUDE_DEST"

run_ok "installer force dry-run" bash "$ROOT/scripts/install.sh" \
    --platform claude --target "$CLAUDE_DEST" --force --dry-run

LINK_DEST="$TMP/install/link/dockerfile-generator"
run_ok "installer symlink" bash "$ROOT/scripts/install.sh" \
    --platform kiro --target "$LINK_DEST" --link
assert_symlink "$LINK_DEST" "installed Kiro skill is a symlink"
assert_file "$LINK_DEST/SKILL.md" "symlinked SKILL.md is readable"

LINK_FIX="$TMP/fixtures/link"
make_python "$LINK_FIX"
run_ok "symlinked skill generates" bash "$LINK_DEST/scripts/generate.sh" \
    --project "$LINK_FIX" --no-dockerfile-2 --fast
assert_file "$LINK_FIX/Dockerfile-1" "symlinked skill wrote Dockerfile-1"

run_fail "copilot global scope rejected" bash "$ROOT/scripts/install.sh" \
    --platform copilot --scope global --dry-run
assert_contains "$LAST_LOG" "no official global skills path" "Copilot global error is clear"

run_fail "installer rejects target with all" bash "$ROOT/scripts/install.sh" \
    --platform all --target "$TMP/nope"

# ---------------------------------------------------------------------------
# Hygiene
# ---------------------------------------------------------------------------

if find "$ROOT/vendor" -type d -name '__pycache__' -print -quit | grep -q .; then
    fail "vendored runtime has no __pycache__"
else
    pass "vendored runtime has no __pycache__"
fi
if find "$ROOT/vendor" -type f \( -name '*.pyc' -o -name '*.pyo' \) -print -quit | grep -q .; then
    fail "vendored runtime has no bytecode files"
else
    pass "vendored runtime has no bytecode files"
fi

printf '\n%d passed, %d failed\n' "$PASS" "$FAIL"
if [ "$FAIL" -ne 0 ]; then
    exit 1
fi
printf 'SMOKE OK\n'
