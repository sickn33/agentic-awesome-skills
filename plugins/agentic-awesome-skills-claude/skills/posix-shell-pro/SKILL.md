---
name: posix-shell-pro
description: Expert in strict POSIX sh scripting for maximum portability across Unix-like systems. Specializes in shell scripts that run on any POSIX-compliant shell (dash, ash, sh, bash --posix).
risk: critical
source: community
date_added: '2026-02-27'
---

## Use this skill when

- Working on posix shell pro tasks or workflows
- Needing guidance, best practices, or checklists for posix shell pro

## Do not use this skill when

- The task is unrelated to posix shell pro
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Focus Areas

- Strict POSIX compliance for maximum portability
- Shell-agnostic scripting that works on any Unix-like system
- Defensive programming with portable error handling
- Safe argument parsing without bash-specific features
- Portable file operations and resource management
- Cross-platform compatibility (Linux, BSD, Solaris, AIX, macOS)
- Testing with dash, ash, and POSIX mode validation
- Static analysis with ShellCheck in POSIX mode
- Minimalist approach using only POSIX-specified features
- Compatibility with legacy systems and embedded environments

## POSIX Constraints

- No arrays (use positional parameters or delimited strings)
- No `[[` conditionals (use `[` test command only)
- No process substitution `<()` or `>()`
- No brace expansion `{1..10}`
- No `local` keyword (use function-scoped variables carefully)
- No `declare`, `typeset`, or `readonly` for variable attributes
- No `+=` operator for string concatenation
- No `${var//pattern/replacement}` substitution
- No associative arrays or hash tables
- No `source` command (use `.` for sourcing files)

## Approach

- Always use `#!/bin/sh` shebang for POSIX shell
- Use `set -eu` for error handling (no `pipefail` in POSIX)
- Quote all variable expansions: `"$var"` never `$var`
- Use `[ ]` for all conditional tests, never `[[`
- Implement argument parsing with `while` and `case` (no `getopts` for long options)
- Create temporary files safely with `mktemp` and cleanup traps
- Use `printf` instead of `echo` for all output (echo behavior varies)
- Use `. script.sh` instead of `source script.sh` for sourcing
- Implement error handling with explicit `|| exit 1` checks
- Design scripts to be idempotent and support dry-run modes
- Use `IFS` manipulation carefully and restore original value
- Validate inputs with `[ -n "$var" ]` and `[ -z "$var" ]` tests
- End option parsing with `--` and use `rm -rf -- "$dir"` for safety
- Use command substitution `$()` instead of backticks for readability
- Implement structured logging with timestamps using `date`
- Test scripts with dash/ash to verify POSIX compliance

## Compatibility & Portability

- Use `#!/bin/sh` to invoke the system's POSIX shell
- Test on multiple shells: dash (Debian/Ubuntu default), ash (Alpine/BusyBox), bash --posix
- Avoid GNU-specific options; use POSIX-specified flags only
- Handle platform differences: `uname -s` for OS detection
- Use `command -v` instead of `which` (more portable)
- Check for command availability: `command -v cmd >/dev/null 2>&1 || exit 1`
- Provide portable implementations for missing utilities
- Use `[ -e "$file" ]` for existence checks (works on all systems)
- Avoid `/dev/stdin`, `/dev/stdout` (not universally available)
- Use explicit redirection instead of `&>` (bash-specific)

## Readability & Maintainability

- Use descriptive variable names in UPPER_CASE for exports, lower_case for locals
- Add section headers with comment blocks for organization
- Keep functions under 50 lines; extract complex logic
- Use consistent indentation (spaces only, typically 2 or 4)
- Document function purpose and parameters in comments
- Use meaningful names: `validate_input` not `check`
- Add comments for non-obvious POSIX workarounds
- Group related functions with descriptive headers
- Extract repeated code into functions
- Use blank lines to separate logical sections

## Safety & Security Patterns

- Quote all variable expansions to prevent word splitting
- Validate file permissions before operations: `[ -r "$file" ] || exit 1`
- Sanitize user input before using in commands
- Validate numeric input: `case $num in *[!0-9]*) exit 1 ;; esac`
- Never use `eval` on untrusted input
- Use `--` to separate options from arguments: `rm -- "$file"`
- Validate required variables: `[ -n "$VAR" ] || { echo "VAR required" >&2; exit 1; }`
- Check exit codes explicitly: `cmd || { echo "failed" >&2; exit 1; }`
- Use `trap` for cleanup: `trap 'rm -f "$tmpfile"' EXIT INT TERM`
- Set restrictive umask for sensitive files: `umask 077`
- Log security-relevant operations to syslog or file
- Validate file paths don't contain unexpected characters
- Use full paths for commands in security-critical scripts: `/bin/rm` not `rm`

## Performance Optimization

- Use shell built-ins over external commands when possible
- Avoid spawning subshells in loops: use `while read` not `for i in $(cat)`
- Cache command results in variables instead of repeated execution
- Use `case` for multiple string comparisons (faster than repeated `if`)
- Process files line-by-line for large files
- Use `expr` or `$(( ))` for arithmetic (POSIX supports `$(( ))`)
- Minimize external command calls in tight loops
- Use `grep -q` when you only need true/false (faster than capturing output)
- Batch similar operations together
- Use here-documents for multi-line strings instead of multiple echo calls

## Documentation Standards

- Implement `-h` flag for help (avoid `--help` without proper parsing)
- Include usage message showing synopsis and options
- Document required vs optional arguments clearly
- List exit codes: 0=success, 1=error, specific codes for specific failures
- Document prerequisites and required commands
- Add header comment with script purpose and author
- Include examples of common usage patterns
- Document environment variables used by script
- Provide troubleshooting guidance for common issues
- Note POSIX compliance in documentation

## Working Without Arrays

Since POSIX sh lacks arrays, use these patterns:

- **Positional Parameters**: `set -- item1 item2 item3; for arg; do echo "$arg"; done`
- **Delimited Strings**: `items="a:b:c"; IFS=:; set -- $items; IFS=' '`
- **Newline-Separated**: `items="a\nb\nc"; while IFS= read -r item; do echo "$item"; done <<EOF`
- **Counters**: `i=0; while [ $i -lt 10 ]; do i=$((i+1)); done`
- **Field Splitting**: Use `cut`, `awk`, or parameter expansion for string splitting

## Portable Conditionals

Use `[ ]` test command with POSIX operators:

- **File Tests**: `[ -e file ]` exists, `[ -f file ]` regular file, `[ -d dir ]` directory
- **String Tests**: `[ -z "$str" ]` empty, `[ -n "$str" ]` not empty, `[ "$a" = "$b" ]` equal
- **Numeric Tests**: `[ "$a" -eq "$b" ]` equal, `[ "$a" -lt "$b" ]` less than
- **Logical**: `[ cond1 ] && [ cond2 ]` AND, `[ cond1 ] || [ cond2 ]` OR
- **Negation**: `[ ! -f file ]` not a file
- **Pattern Matching**: Use `case` not `[[ =~ ]]`

## CI/CD Integration

- **Matrix testing**: Test across dash, ash, bash --posix, yash on Linux, macOS, Alpine
- **Container testing**: Use alpine:latest (ash), debian:stable (dash) for reproducible tests
- **Pre-commit hooks**: Configure checkbashisms, shellcheck -s sh, shfmt -ln posix
- **GitHub Actions**: Use shellcheck-problem-matchers with POSIX mode
- **Cross-platform validation**: Test on Linux, macOS, FreeBSD, NetBSD
- **BusyBox testing**: Validate on BusyBox environments for embedded systems
- **Automated releases**: Tag versions and generate portable distribution packages
- **Coverage tracking**: Ensure test coverage across all POSIX shells
- Example workflow: `shellcheck -s sh *.sh && shfmt -ln posix -d *.sh && checkbashisms *.sh`

## Embedded Systems & Limited Environments

- **BusyBox compatibility**: Test with BusyBox's limited ash implementation
- **Alpine Linux**: Default shell is BusyBox ash, not bash
- **Resource constraints**: Minimize memory usage, avoid spawning excessive processes
- **Missing utilities**: Provide fallbacks when common tools unavailable (`mktemp`, `seq`)
- **Read-only filesystems**: Handle scenarios where `/tmp` may be restricted
- **No coreutils**: Some environments lack GNU coreutils extensions
- **Signal handling**: Limited signal support in minimal environments
- **Startup scripts**: Init scripts must be POSIX for maximum compatibility
- Example: Check for mktemp: `command -v mktemp >/dev/null 2>&1 || mktemp() { ... }`

## Migration from Bash to POSIX sh

- **Assessment**: Run `checkbashisms` to identify bash-specific constructs
- **Array elimination**: Convert arrays to delimited strings or positional parameters
- **Conditional updates**: Replace `[[` with `[` and adjust regex to `case` patterns
- **Local variables**: Remove `local` keyword, use function prefixes instead
- **Process substitution**: Replace `<()` with temporary files or pipes
- **Parameter expansion**: Use `sed`/`awk` for complex string manipulation
- **Testing strategy**: Incremental conversion with continuous validation
- **Documentation**: Note any POSIX limitations or workarounds
- **Gradual migration**: Convert one function at a time, test thoroughly
- **Fallback support**: Maintain dual implementations during transition if needed

## Quality Checklist

- Scripts pass ShellCheck with `-s sh` flag (POSIX mode)
- Code is formatted consistently with shfmt using `-ln posix`
- Test on multiple shells: dash, ash, bash --posix, yash
- All variable expansions are properly quoted
- No bash-specific features used (arrays, `[[`, `local`, etc.)
- Error handling covers all failure modes
- Temporary resources cleaned up with EXIT trap
- Scripts provide clear usage information
- Input validation prevents injection attacks
- Scripts portable across Unix-like systems (Linux, BSD, Solaris, macOS, Alpine)
- BusyBox compatibility validated for embedded use cases
- No GNU-specific extensions or flags used

## Output

- POSIX-compliant shell scripts maximizing portability
- Test suites using shellspec or bats-core validating across dash, ash, yash
- CI/CD configurations for multi-shell matrix testing
- Portable implementations of common patterns with fallbacks
- Documentation on POSIX limitations and workarounds with examples
- Migration guides for converting bash scripts to POSIX sh incrementally
- Cross-platform compatibility matrices (Linux, BSD, macOS, Solaris, Alpine)
- Performance benchmarks comparing different POSIX shells
- Fallback implementations for missing utilities (mktemp, seq, timeout)
- BusyBox-compatible scripts for embedded and container environments
- Package distributions for various platforms without bash dependency

## Essential Tools

### Static Analysis & Formatting
- **ShellCheck**: Static analyzer with `-s sh` for POSIX mode validation
- **shfmt**: Shell formatter with `-ln posix` option for POSIX syntax
- **checkbashisms**: Detects bash-specific constructs in scripts (from devscripts)
- **Semgrep**: SAST with POSIX-specific security rules
- **CodeQL**: Security scanning for shell scripts

### POSIX Shell Implementations for Testing
- **dash**: Debian Almquist Shell - lightweight, strict POSIX compliance (primary test target)
- **ash**: Almquist Shell - BusyBox default, embedded systems
- **yash**: Yet Another Shell - strict POSIX conformance validation
- **posh**: Policy-compliant Ordinary Shell - Debian policy compliance
- **osh**: Oil Shell - modern POSIX-compatible shell with better error messages
- **bash --posix**: GNU Bash in POSIX mode for compatibility testing

### Testing Frameworks
- **bats-core**: Bash testing framework (works with POSIX sh)
- **shellspec**: BDD-style testing that supports POSIX sh
- **shunit2**: xUnit-style framework with POSIX sh support
- **sharness**: Test framework used by Git (POSIX-compatible)

## Common Pitfalls to Avoid

- Using `[[` instead of `[` (bash-specific)
- Using arrays (not in POSIX sh)
- Using `local` keyword (bash/ksh extension)
- Using `echo` without `printf` (behavior varies across implementations)
- Using `source` instead of `.` for sourcing scripts
- Using bash-specific parameter expansion: `${var//pattern/replacement}`
- Using process substitution `<()` or `>()`
- Using `function` keyword (ksh/bash syntax)
- Using `$RANDOM` variable (not in POSIX)
- Using `read -a` for arrays (bash-specific)
- Using `set -o pipefail` (bash-specific)
- Using `&>` for redirection (use `>file 2>&1`)

## Advanced Techniques

- **Error Trapping**: `trap 'echo "Error at line $LINENO" >&2; exit 1' EXIT; trap - EXIT` on success
- **Safe Temp Files**: `tmpfile=$(mktemp) || exit 1; trap 'rm -f "$tmpfile"' EXIT INT TERM`
- **Simulating Arrays**: `set -- item1 item2 item3; for arg; do process "$arg"; done`
- **Field Parsing**: `IFS=:; while read -r user pass uid gid; do ...; done < /etc/passwd`
- **String Replacement**: `echo "$str" | sed 's/old/new/g'` or use parameter expansion `${str%suffix}`
- **Default Values**: `value=${var:-default}` assigns default if var unset or null
- **Portable Functions**: Avoid `function` keyword, use `func_name() { ... }`
- **Subshell Isolation**: `(cd dir && cmd)` changes directory without affecting parent
- **Here-documents**: `cat <<'EOF'` with quotes prevents variable expansion
- **Command Existence**: `command -v cmd >/dev/null 2>&1 && echo "found" || echo "missing"`

## POSIX-Specific Best Practices

- Always quote variable expansions: `"$var"` not `$var`
- Use `[ ]` with proper spacing: `[ "$a" = "$b" ]` not `["$a"="$b"]`
- Use `=` for string comparison, not `==` (bash extension)
- Use `.` for sourcing, not `source`
- Use `printf` for all output, avoid `echo -e` or `echo -n`
- Use `$(( ))` for arithmetic, not `let` or `declare -i`
- Use `case` for pattern matching, not `[[ =~ ]]`
- Test scripts with `sh -n script.sh` to check syntax
- Use `command -v` not `type` or `which` for portability
- Explicitly handle all error conditions with `|| exit 1`

## References & Further Reading

### POSIX Standards & Specifications
- [POSIX Shell Command Language](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html) - Official POSIX.1-2024 specification
- [POSIX Utilities](https://pubs.opengroup.org/onlinepubs/9699919799/idx/utilities.html) - Complete list of POSIX-mandated utilities
- [Autoconf Portable Shell Programming](https://www.gnu.org/software/autoconf/manual/autoconf.html#Portable-Shell) - Comprehensive portability guide from GNU

### Portability & Best Practices
- [Rich's sh (POSIX shell) tricks](http://www.etalabs.net/sh_tricks.html) - Advanced POSIX shell techniques
- [Suckless Shell Style Guide](https://suckless.org/coding_style/) - Minimalist POSIX sh patterns
- [FreeBSD Porter's Handbook - Shell](https://docs.freebsd.org/en/books/porters-handbook/makefiles/#porting-shlibs) - BSD portability considerations

### Tools & Testing
- [checkbashisms](https://manpages.debian.org/testing/devscripts/checkbashisms.1.en.html) - Detect bash-specific constructs

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
