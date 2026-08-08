---
name: bash-scripting
description: "Bash scripting workflow for creating production-ready shell scripts with defensive patterns, error handling, and testing."
category: granular-workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
---

# Bash Scripting Workflow

## Overview

Specialized workflow for creating robust, production-ready bash scripts with defensive programming patterns, comprehensive error handling, and automated testing.

## When to Use This Workflow

Use this workflow when:
- Creating automation scripts
- Writing system administration tools
- Building deployment scripts
- Developing backup solutions
- Creating CI/CD scripts

## Workflow Phases

### Phase 1: Script Design

#### Skills to Invoke
- `bash-pro` - Professional scripting
- `bash-defensive-patterns` - Defensive patterns

#### Actions
1. Define script purpose
2. Identify inputs/outputs
3. Plan error handling
4. Design logging strategy
5. Document requirements

#### Copy-Paste Prompts
```
Use @bash-pro to design production-ready bash script
```

### Phase 2: Script Structure

#### Skills to Invoke
- `bash-pro` - Script structure
- `bash-defensive-patterns` - Safety patterns

#### Actions
1. Add shebang and strict mode
2. Create usage function
3. Implement argument parsing
4. Set up logging
5. Add cleanup handlers

#### Copy-Paste Prompts
```
Use @bash-defensive-patterns to implement strict mode and error handling
```

### Phase 3: Core Implementation

#### Skills to Invoke
- `bash-linux` - Linux commands
- `linux-shell-scripting` - Shell scripting

#### Actions
1. Implement main functions
2. Add input validation
3. Create helper functions
4. Handle edge cases
5. Add progress indicators

#### Copy-Paste Prompts
```
Use @bash-linux to implement system commands
```

### Phase 4: Error Handling

#### Skills to Invoke
- `bash-defensive-patterns` - Error handling
- `error-handling-patterns` - Error patterns

#### Actions
1. Add trap handlers
2. Implement retry logic
3. Create error messages
4. Set up exit codes
5. Add rollback capability

#### Copy-Paste Prompts
```
Use @bash-defensive-patterns to add comprehensive error handling
```

### Phase 5: Logging

#### Skills to Invoke
- `bash-pro` - Logging patterns

#### Actions
1. Create logging function
2. Add log levels
3. Implement timestamps
4. Configure log rotation
5. Add debug mode

#### Copy-Paste Prompts
```
Use @bash-pro to implement structured logging
```

### Phase 6: Testing

#### Skills to Invoke
- `bats-testing-patterns` - Bats testing
- `shellcheck-configuration` - ShellCheck

#### Actions
1. Write Bats tests
2. Run ShellCheck
3. Test edge cases
4. Verify error handling
5. Test with different inputs

#### Copy-Paste Prompts
```
Use @bats-testing-patterns to write script tests
```

```
Use @shellcheck-configuration to lint bash script
```

### Phase 7: Documentation

#### Skills to Invoke
- `documentation-templates` - Documentation

#### Actions
1. Add script header
2. Document functions
3. Create usage examples
4. List dependencies
5. Add troubleshooting section

#### Copy-Paste Prompts
```
Use @documentation-templates to document bash script
```

## Script Template

```bash
#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_NAME=$(basename "$0")
readonly SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
error() { log "ERROR: $*" >&2; exit 1; }

usage() { cat <<EOF
Usage: $SCRIPT_NAME [OPTIONS]
Options:
    -h, --help      Show help
    -v, --verbose   Verbose output
EOF
}

main() {
    log "Script started"
    # Implementation
    log "Script completed"
}

main "$@"
```

## Quality Gates

- [ ] ShellCheck passes
- [ ] Bats tests pass
- [ ] Error handling works
- [ ] Logging functional
- [ ] Documentation complete

## Related Workflow Bundles

- `os-scripting` - OS scripting
- `linux-troubleshooting` - Linux troubleshooting
- `cloud-devops` - DevOps automation

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
