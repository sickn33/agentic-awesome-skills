---
name: bash
description: "Language-specific super-code guidelines for bash."
risk: safe
source: community
date_added: "2026-06-16"
---
# Bash / Shell: Idiomatic Efficiency Reference

## When to Use
- Use this skill when the task matches this description: Language-specific super-code guidelines for bash.

## Table of Contents
1. [Quoting & Word Splitting](#quoting)
2. [Conditionals & Tests](#conditionals)
3. [Loops & Iteration](#loops)
4. [Pipes & Process Substitution](#pipes)
5. [Functions & Return Values](#functions)
6. [Error Handling](#errors)
7. [Anti-patterns specific to Bash](#antipatterns)

---

## 1. Quoting & Word Splitting {#quoting}

```bash
# ❌ Unquoted variable (word splitting + globbing)
for f in $files; do rm $f; done

# ✅
for f in "${files[@]}"; do rm -- "$f"; done
```

```bash
# ❌ Unquoted command substitution
path=$(find . -name config)
cat $path  # breaks on spaces

# ✅
path="$(find . -name config)"
cat "$path"
```

```bash
# ❌ Using backticks for command substitution
result=`echo hello`

# ✅ — $() nests cleanly
result=$(echo hello)
```

```bash
# ❌ String comparison without quotes
if [ $var = "hello" ]; then  # breaks if var is empty or has spaces

# ✅
if [[ "$var" = "hello" ]]; then
```

**Rule: double-quote every `$variable` and `$(command)` unless you specifically need splitting.**

---

## 2. Conditionals & Tests {#conditionals}

```bash
# ❌ Single bracket test (POSIX but fragile)
if [ -f "$file" -a -r "$file" ]; then

# ✅ — [[ is safer, supports &&/||, no word splitting inside
if [[ -f "$file" && -r "$file" ]]; then
```

```bash
# ❌ Testing command exit status with if [ $? -eq 0 ]
grep -q pattern file
if [ $? -eq 0 ]; then echo "found"; fi

# ✅ — test command directly
if grep -q pattern file; then echo "found"; fi
```

```bash
# ❌ String equality with == outside [[
if [ "$a" == "$b" ]; then  # == not POSIX in [ ]

# ✅
if [[ "$a" == "$b" ]]; then  # Bash
# or POSIX:
if [ "$a" = "$b" ]; then
```

```bash
# ❌ Arithmetic with [ ] and string comparison
if [ "$count" -gt 10 ]; then

# ✅ — (( )) for arithmetic
if (( count > 10 )); then
```

---

## 3. Loops & Iteration {#loops}

```bash
# ❌ Parsing ls output
for f in $(ls *.txt); do process "$f"; done

# ✅ — glob directly
for f in *.txt; do
    [[ -e "$f" ]] || continue  # handle no-match
    process "$f"
done
```

```bash
# ❌ Reading file line-by-line with for
for line in $(cat file.txt); do  # splits on words, not lines

# ✅
while IFS= read -r line; do
    process "$line"
done < file.txt
```

```bash
# ❌ Seq for counting
for i in $(seq 1 10); do

# ✅ — brace expansion (Bash)
for i in {1..10}; do
# or C-style:
for (( i = 1; i <= 10; i++ )); do
```

```bash
# ❌ Processing command output line-by-line with pipe (subshell trap)
count=0
cat file.txt | while read -r line; do
    (( count++ ))  # count resets after loop — subshell
done
echo "$count"  # always 0

# ✅ — redirect, not pipe
count=0
while IFS= read -r line; do
    (( count++ ))
done < file.txt
echo "$count"
```

---

## 4. Pipes & Process Substitution {#pipes}

```bash
# ❌ Chained grep | grep for AND
grep "error" log.txt | grep "timeout"

# ✅ — single grep with pattern
grep -E "error.*timeout|timeout.*error" log.txt
# or awk for complex logic:
awk '/error/ && /timeout/' log.txt
```

```bash
# ❌ cat + pipe (UUOC — Useless Use of Cat)
cat file.txt | grep pattern

# ✅
grep pattern file.txt
```

```bash
# ❌ Temp file for diff between commands
cmd1 > /tmp/a.txt
cmd2 > /tmp/b.txt
diff /tmp/a.txt /tmp/b.txt
rm /tmp/a.txt /tmp/b.txt

# ✅ — process substitution
diff <(cmd1) <(cmd2)
```

```bash
# ❌ Ignoring pipe failures (only last command's exit code)
false | true
echo $?  # 0 — false's failure hidden

# ✅
set -o pipefail
false | true
echo $?  # 1
```

---

## 5. Functions & Return Values {#functions}

```bash
# ❌ Using return for string values
get_name() {
    return "Alice"  # return is for exit codes (0-255)
}

# ✅ — echo + capture
get_name() {
    echo "Alice"
}
name=$(get_name)
```

```bash
# ❌ Global variables modified inside functions
result=""
compute() { result="done"; }

# ✅ — use local, return via stdout
compute() {
    local tmp
    tmp=$(do_work)
    echo "$tmp"
}
result=$(compute)
```

```bash
# ❌ Function keyword (not POSIX)
function my_func {

# ✅
my_func() {
```

---

## 6. Error Handling {#errors}

```bash
# ❌ No error handling — script continues after failure
cd /some/dir
rm -rf *  # if cd fails, deletes from wrong directory

# ✅
set -euo pipefail

cd /some/dir || { echo "cd failed" >&2; exit 1; }
rm -rf ./*
```

```bash
# ❌ No cleanup on exit
tmpfile=$(mktemp)
# ... script might exit early, leaving tmpfile

# ✅ — trap for cleanup
tmpfile=$(mktemp)
trap 'rm -f "$tmpfile"' EXIT
```

```bash
# ❌ Silencing errors blindly
command 2>/dev/null

# ✅ — redirect only when you know what you're suppressing
command 2>/dev/null || true  # explicit: we expect and accept failure
```

**Start every script with `set -euo pipefail`. Remove selectively where needed.**

---

## 7. Anti-patterns specific to Bash {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| Parsing `ls` output | glob: `for f in *.txt` |
| `cat file \| grep` | `grep pattern file` |
| Unquoted `$var` | `"$var"` always |
| `[ ]` for complex tests | `[[ ]]` |
| Backtick substitution | `$(command)` |
| `$?` check after command | `if command; then` |
| `echo` for debug | `printf '%s\n'` (portable) |
| No `set -euo pipefail` | always set at script top |
| Temp files without cleanup | `trap 'rm -f "$tmp"' EXIT` |
| `eval` with user input | avoid; use arrays for dynamic commands |
| `#!/bin/sh` with Bash features | `#!/usr/bin/env bash` |
| String math `expr 1 + 1` | `$(( 1 + 1 ))` |
| `test -z` for number comparison | `(( ))` for arithmetic |



## Limitations
- These are language-specific guidelines and do not cover overall architectural decisions.
- Over-compression might reduce readability; apply judgement.
