---
name: shellcheck-configuration
description: "Master ShellCheck static analysis configuration and usage for shell script quality. Use when setting up linting infrastructure, fixing code issues, or ensuring script portability."
risk: critical
source: community
date_added: "2026-02-27"
---

# ShellCheck Configuration and Static Analysis

Comprehensive guidance for configuring and using ShellCheck to improve shell script quality, catch common pitfalls, and enforce best practices through static code analysis.

## Do not use this skill when

- The task is unrelated to shellcheck configuration and static analysis
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.

## Use this skill when

- Setting up linting for shell scripts in CI/CD pipelines
- Analyzing existing shell scripts for issues
- Understanding ShellCheck error codes and warnings
- Configuring ShellCheck for specific project requirements
- Integrating ShellCheck into development workflows
- Suppressing false positives and configuring rule sets
- Enforcing consistent code quality standards
- Migrating scripts to meet quality gates

## ShellCheck Fundamentals

### What is ShellCheck?

ShellCheck is a static analysis tool that analyzes shell scripts and detects problematic patterns. It supports:
- Bash, sh, dash, ksh, and other POSIX shells
- Over 100 different warnings and errors
- Configuration for target shell and flags
- Integration with editors and CI/CD systems

### Installation

```bash
# macOS with Homebrew
brew install shellcheck

# Ubuntu/Debian
apt-get install shellcheck

# From source
git clone https://github.com/koalaman/shellcheck.git
cd shellcheck
make build
make install

# Verify installation
shellcheck --version
```

## Configuration Files

### .shellcheckrc (Project Level)

Create `.shellcheckrc` in your project root:

```
# Specify target shell
shell=bash

# Enable optional checks
enable=avoid-nullary-conditions
enable=require-variable-braces

# Disable specific warnings
disable=SC1091
disable=SC2086
```

### Options and diagnostic reference

Use the installed `shellcheck --help` and official diagnostic pages. Do not rely
on invented SHELLCHECK_SHELL/STRICT/CONFIG environment variables or numeric-code
ranges as categories. Set `--shell=bash` (or sh), `--enable` and exclusions
explicitly; scope suppressions narrowly with a recorded reason.

- SC2086: unquoted expansions can split/glob. For a Bash array, iterate with
  `for item in "${items[@]}"; do ...; done`; quoting an entire scalar list changes
  semantics and is not a universal fix.
- SC2206: `array=( $items )` still performs splitting/globbing; construct an array
  deliberately or use a suitable read/mapfile operation for the actual format.
- SC2181: check the command directly with `if command; then ...; fi`.
- SC2015: `a && b || c` also runs c when b fails; use if/else when that matters.
- SC3010: `[[ ... ]]` is not POSIX sh; use a valid `[ ... ]` or case construct.

See [SC2086](https://www.shellcheck.net/wiki/SC2086) and the
[official project/options](https://github.com/koalaman/shellcheck).

## Practical Configuration Examples

### Minimal Configuration (Strict POSIX)

```bash
#!/bin/bash
# Configure for maximum portability

shellcheck \
  --shell=sh \
  --external-sources \
  --check-sourced \
  script.sh
```

### Development Configuration (Bash with Relaxed Rules)

```bash
#!/bin/bash
# Configure for Bash development

shellcheck \
  --shell=bash \
  --exclude=SC1091,SC2119 \
  --enable=all \
  script.sh
```

### CI/CD Integration Configuration

```bash
#!/bin/bash
set -Eeuo pipefail

# Analyze all shell scripts and fail on issues
find . -type f -name "*.sh" | while read -r script; do
    echo "Checking: $script"
    shellcheck \
        --shell=bash \
        --format=gcc \
        --exclude=SC1091 \
        "$script" || exit 1
done
```

### .shellcheckrc for Project

```
# Shell dialect to analyze against
shell=bash

# Enable optional checks
enable=avoid-nullary-conditions,require-variable-braces,check-unassigned-uppercase

# Disable specific warnings
# SC1091: Not following sourced files (many false positives)
disable=SC1091

# SC2119: Use function_name instead of function_name -- (arguments)
disable=SC2119

# External files to source for context
external-sources=true
```

## Integration Patterns

### Pre-commit Hook Configuration

```bash
#!/bin/bash
# .git/hooks/pre-commit

#!/bin/bash
set -e

# Find all shell scripts changed in this commit
git diff --cached --name-only | grep '\.sh$' | while read -r script; do
    echo "Linting: $script"

    if ! shellcheck "$script"; then
        echo "ShellCheck failed on $script"
        exit 1
    fi
done
```

### GitHub Actions Workflow

```yaml
name: ShellCheck

on: [push, pull_request]

jobs:
  shellcheck:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Run ShellCheck
        run: |
          sudo apt-get install shellcheck
          find . -type f -name "*.sh" -print0 | xargs -0 shellcheck
```

### GitLab CI Pipeline

```yaml
shellcheck:
  stage: lint
  image: koalaman/shellcheck-alpine
  script:
    - find . -type f -name "*.sh" -print0 | xargs -0 shellcheck
  allow_failure: false
```

## Handling ShellCheck Violations

### Suppressing Specific Warnings

```bash
#!/bin/bash

# Disable warning for entire line
# shellcheck disable=SC2086
for file in $(ls -la); do
    echo "$file"
done

# Disable for entire script
# shellcheck disable=SC1091,SC2119

# Disable multiple warnings (format varies)
command_that_fails() {
    # shellcheck disable=SC2015
    [ -f "$1" ] && echo "found" || echo "not found"
}

# Disable specific check for source directive
# shellcheck source=./helper.sh
source helper.sh
```

### Common Violations and Fixes

#### SC2086: Double quote to prevent word splitting

```bash
# Problem
for i in $list; do done

# Solution
for i in "${list[@]}"; do printf '%s\n' "$i"; done  # Bash array, not a scalar list
```

#### SC2181: Check exit code directly

```bash
# Problem
some_command
if [ $? -eq 0 ]; then
    echo "success"
fi

# Solution
if some_command; then
    echo "success"
fi
```

#### SC2015: Use if-then instead of && ||

```bash
# Problem
[ -f "$file" ] && echo "exists" || echo "not found"

# Solution - clearer intent
if [ -f "$file" ]; then
    echo "exists"
else
    echo "not found"
fi
```

#### SC2016: Expressions don't expand in single quotes

```bash
# Problem
echo 'Variable value: $VAR'

# Solution
echo "Variable value: $VAR"
```

#### SC2009: Use pgrep instead of grep

```bash
# Problem
ps aux | grep -v grep | grep myprocess

# Solution
pgrep -f myprocess
```

## Performance Optimization

### Checking Multiple Files

```bash
#!/bin/bash

# Sequential checking
for script in *.sh; do
    shellcheck "$script"
done

# Parallel checking (faster)
find . -name "*.sh" -print0 | \
    xargs -0 -P 4 -n 1 shellcheck
```

Bind cached results to ShellCheck version/options, shell dialect, rc files and sourced-file contents as well as the main script. The hash-only example below is insufficient for CI reuse when those inputs change. Pre-commit checks must inspect staged bytes (including partially staged files) rather than silently linting a different working tree. Use NUL-delimited paths and exclude deleted files.

### Caching Results

```bash
#!/bin/bash

CACHE_DIR=".shellcheck_cache"
mkdir -p "$CACHE_DIR"

check_script() {
    local script="$1"
    local hash
    local cache_file

    hash=$(sha256sum "$script" | cut -d' ' -f1)
    cache_file="$CACHE_DIR/$hash"

    if [[ ! -f "$cache_file" ]]; then
        if shellcheck "$script" > "$cache_file" 2>&1; then
            touch "$cache_file.ok"
        else
            return 1
        fi
    fi

    [[ -f "$cache_file.ok" ]]
}

find . -name "*.sh" | while read -r script; do
    check_script "$script" || exit 1
done
```

## Output Formats

### Default Format

```bash
shellcheck script.sh

# Output:
# script.sh:1:3: warning: foo is referenced but not assigned. [SC2154]
```

### GCC Format (for CI/CD)

```bash
shellcheck --format=gcc script.sh

# Output:
# script.sh:1:3: warning: foo is referenced but not assigned.
```

### JSON Format (for parsing)

```bash
shellcheck --format=json script.sh

# Output:
# [{"file": "script.sh", "line": 1, "column": 3, "level": "warning", "code": 2154, "message": "..."}]
```

### Quiet Format

```bash
shellcheck --format=quiet script.sh

# Returns non-zero if issues found, no output otherwise
```

## Best Practices

1. **Run ShellCheck in CI/CD** - Catch issues before merging
2. **Configure for your target shell** - Don't analyze bash as sh
3. **Document exclusions** - Explain why violations are suppressed
4. **Address violations** - Don't just disable warnings
5. **Enable strict mode** - Use `--enable=all` with careful exclusions
6. **Update regularly** - Keep ShellCheck current for new checks
7. **Use pre-commit hooks** - Catch issues locally before pushing
8. **Integrate with editors** - Get real-time feedback during development

## Resources

- **ShellCheck GitHub**: https://github.com/koalaman/shellcheck
- **ShellCheck Wiki**: https://www.shellcheck.net/wiki/
- **Error Code Reference**: https://www.shellcheck.net/

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
