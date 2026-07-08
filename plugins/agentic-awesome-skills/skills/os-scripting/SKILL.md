---
name: os-scripting
description: "Operating system and shell scripting troubleshooting workflow for Linux, macOS, and Windows. Covers bash scripting, system administration, debugging, and automation."
category: workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
---

# OS/Shell Scripting Troubleshooting Workflow Bundle

## Overview

Comprehensive workflow for operating system troubleshooting, shell scripting, and system administration across Linux, macOS, and Windows. This bundle orchestrates skills for debugging system issues, creating robust scripts, and automating administrative tasks.

## When to Use This Workflow

Use this workflow when:
- Debugging shell script errors
- Creating production-ready bash scripts
- Troubleshooting system issues
- Automating system administration tasks
- Managing processes and services
- Configuring system resources

## Workflow Phases

### Phase 1: Environment Assessment

#### Skills to Invoke
- `bash-linux` - Linux bash patterns
- `bash-pro` - Professional bash scripting
- `bash-defensive-patterns` - Defensive scripting

#### Actions
1. Identify operating system and version
2. Check available tools and commands
3. Verify permissions and access
4. Assess system resources
5. Review logs and error messages

#### Diagnostic Commands
```bash
# System information
uname -a
cat /etc/os-release
hostnamectl

# Resource usage
top
htop
df -h
free -m

# Process information
ps aux
pgrep -f pattern
lsof -i :port

# Network status
netstat -tulpn
ss -tulpn
ip addr show
```

#### Copy-Paste Prompts
```
Use @bash-linux to diagnose system performance issues
```

### Phase 2: Script Analysis

#### Skills to Invoke
- `bash-defensive-patterns` - Defensive scripting
- `shellcheck-configuration` - ShellCheck linting
- `bats-testing-patterns` - Bats testing

#### Actions
1. Run ShellCheck for linting
2. Analyze script structure
3. Identify potential issues
4. Check error handling
5. Verify variable usage

#### ShellCheck Usage
```bash
# Install ShellCheck
sudo apt install shellcheck  # Debian/Ubuntu
brew install shellcheck      # macOS

# Run ShellCheck
shellcheck script.sh
shellcheck -f gcc script.sh

# Fix common issues
# - Use quotes around variables
# - Check exit codes
# - Handle errors properly
```

#### Copy-Paste Prompts
```
Use @shellcheck-configuration to lint and fix shell scripts
```

### Phase 3: Debugging

#### Skills to Invoke
- `systematic-debugging` - Systematic debugging
- `debugger` - Debugging specialist
- `error-detective` - Error pattern detection

#### Actions
1. Enable debug mode
2. Add logging statements
3. Trace execution flow
4. Isolate failing sections
5. Test components individually

#### Debug Techniques
```bash
# Enable debug mode
set -x  # Print commands
set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Pipeline failure detection

# Add logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> /var/log/script.log
}

# Trap errors
trap 'echo "Error on line $LINENO"' ERR

# Test sections
bash -n script.sh  # Syntax check
bash -x script.sh  # Trace execution
```

#### Copy-Paste Prompts
```
Use @systematic-debugging to trace and fix shell script errors
```

### Phase 4: Script Development

#### Skills to Invoke
- `bash-pro` - Professional scripting
- `bash-defensive-patterns` - Defensive patterns
- `linux-shell-scripting` - Shell scripting

#### Actions
1. Design script structure
2. Implement functions
3. Add error handling
4. Include input validation
5. Add help documentation

#### Script Template
```bash
#!/usr/bin/env bash
set -euo pipefail

# Constants
readonly SCRIPT_NAME=$(basename "$0")
readonly SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# Logging
log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" >&2
}

info() { log "INFO" "$@"; }
warn() { log "WARN" "$@"; }
error() { log "ERROR" "$@"; exit 1; }

# Usage
usage() {
    cat <<EOF
Usage: $SCRIPT_NAME [OPTIONS]

Options:
    -h, --help      Show this help message
    -v, --verbose   Enable verbose output
    -d, --debug     Enable debug mode

Examples:
    $SCRIPT_NAME --verbose
    $SCRIPT_NAME -d
EOF
}

# Main function
main() {
    local verbose=false
    local debug=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)
                usage
                exit 0
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            -d|--debug)
                debug=true
                set -x
                shift
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done

    info "Script started"
    # Your code here
    info "Script completed"
}

main "$@"
```

#### Copy-Paste Prompts
```
Use @bash-pro to create a production-ready backup script
```

```
Use @linux-shell-scripting to automate system maintenance tasks
```

### Phase 5: Testing

#### Skills to Invoke
- `bats-testing-patterns` - Bats testing framework
- `test-automator` - Test automation

#### Actions
1. Write Bats tests
2. Test edge cases
3. Test error conditions
4. Verify expected outputs
5. Run test suite

#### Bats Test Example
```bash
#!/usr/bin/env bats

@test "script returns success" {
    run ./script.sh
    [ "$status" -eq 0 ]
}

@test "script handles missing arguments" {
    run ./script.sh
    [ "$status" -ne 0 ]
    [ "$output" == *"Usage:"* ]
}

@test "script creates expected output" {
    run ./script.sh --output test.txt
    [ -f "test.txt" ]
}
```

#### Copy-Paste Prompts
```
Use @bats-testing-patterns to write tests for shell scripts
```

### Phase 6: System Troubleshooting

#### Skills to Invoke
- `devops-troubleshooter` - DevOps troubleshooting
- `incident-responder` - Incident response
- `server-management` - Server management

#### Actions
1. Identify symptoms
2. Check system logs
3. Analyze resource usage
4. Test connectivity
5. Verify configurations
6. Implement fixes

#### Troubleshooting Commands
```bash
# Check logs
journalctl -xe
tail -f /var/log/syslog
dmesg | tail

# Network troubleshooting
ping host
traceroute host
curl -v http://host
dig domain
nslookup domain

# Process troubleshooting
strace -p PID
lsof -p PID
iotop

# Disk troubleshooting
du -sh /*
find / -type f -size +100M
lsof | grep deleted
```

#### Copy-Paste Prompts
```
Use @devops-troubleshooter to diagnose server connectivity issues
```

```
Use @incident-responder to investigate system outage
```

### Phase 7: Automation

#### Skills to Invoke
- `workflow-automation` - Workflow automation
- `cicd-automation-workflow-automate` - CI/CD automation
- `linux-shell-scripting` - Shell scripting

#### Actions
1. Identify automation opportunities
2. Design automation workflows
3. Implement scripts
4. Schedule with cron/systemd
5. Monitor automation health

#### Cron Examples
```bash
# Edit crontab
crontab -e

# Backup every day at 2 AM
0 2 * * * /path/to/backup.sh

# Clean logs weekly
0 3 * * 0 /path/to/cleanup.sh

# Monitor disk space hourly
0 * * * * /path/to/monitor.sh
```

#### Systemd Timer Example
```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Daily backup timer

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

#### Copy-Paste Prompts
```
Use @workflow-automation to create automated system maintenance workflow
```

## Common Troubleshooting Scenarios

### High CPU Usage
```bash
top -bn1 | head -20
ps aux --sort=-%cpu | head -10
pidstat 1 5
```

### Memory Issues
```bash
free -h
vmstat 1 10
cat /proc/meminfo
```

### Disk Space
```bash
df -h
du -sh /* 2>/dev/null | sort -h
find / -type f -size +500M 2>/dev/null
```

### Network Issues
```bash
ip addr show
ip route show
ss -tulpn
curl -v http://target
```

### Service Failures
```bash
systemctl status service-name
journalctl -u service-name -f
systemctl restart service-name
```

## Quality Gates

Before completing workflow, verify:
- [ ] All scripts pass ShellCheck
- [ ] Tests pass with Bats
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Documentation complete
- [ ] Automation scheduled

## Related Workflow Bundles

- `development` - Software development
- `cloud-devops` - Cloud and DevOps
- `security-audit` - Security testing
- `database` - Database operations

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
