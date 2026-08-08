---
name: linux-troubleshooting
description: "Linux system troubleshooting workflow for diagnosing and resolving system issues, performance problems, and service failures."
category: granular-workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
---

# Linux Troubleshooting Workflow

## Overview

Specialized workflow for diagnosing and resolving Linux system issues including performance problems, service failures, network issues, and resource constraints.

## When to Use This Workflow

Use this workflow when:
- Diagnosing system performance issues
- Troubleshooting service failures
- Investigating network problems
- Resolving disk space issues
- Debugging application errors

## Workflow Phases

### Phase 1: Initial Assessment

#### Skills to Invoke
- `bash-linux` - Linux commands
- `devops-troubleshooter` - Troubleshooting

#### Actions
1. Check system uptime
2. Review recent changes
3. Identify symptoms
4. Gather error messages
5. Document findings

#### Commands
```bash
uptime
hostnamectl
cat /etc/os-release
dmesg | tail -50
```

#### Copy-Paste Prompts
```
Use @bash-linux to gather system information
```

### Phase 2: Resource Analysis

#### Skills to Invoke
- `bash-linux` - Resource commands
- `performance-engineer` - Performance analysis

#### Actions
1. Check CPU usage
2. Analyze memory
3. Review disk space
4. Monitor I/O
5. Check network

#### Commands
```bash
top -bn1 | head -20
free -h
df -h
iostat -x 1 5
```

#### Copy-Paste Prompts
```
Use @performance-engineer to analyze system resources
```

### Phase 3: Process Investigation

#### Skills to Invoke
- `bash-linux` - Process commands
- `server-management` - Process management

#### Actions
1. List running processes
2. Identify resource hogs
3. Check process status
4. Review process trees
5. Analyze strace output

#### Commands
```bash
ps aux --sort=-%cpu | head -10
pstree -p
lsof -p PID
strace -p PID
```

#### Copy-Paste Prompts
```
Use @server-management to investigate processes
```

### Phase 4: Log Analysis

#### Skills to Invoke
- `bash-linux` - Log commands
- `error-detective` - Error detection

#### Actions
1. Check system logs
2. Review application logs
3. Search for errors
4. Analyze log patterns
5. Correlate events

#### Commands
```bash
journalctl -xe
tail -f /var/log/syslog
grep -i error /var/log/*
```

#### Copy-Paste Prompts
```
Use @error-detective to analyze log files
```

### Phase 5: Network Diagnostics

#### Skills to Invoke
- `bash-linux` - Network commands
- `network-engineer` - Network troubleshooting

#### Actions
1. Check network interfaces
2. Test connectivity
3. Analyze connections
4. Review firewall rules
5. Check DNS resolution

#### Commands
```bash
ip addr show
ss -tulpn
curl -v http://target
dig domain
```

#### Copy-Paste Prompts
```
Use @network-engineer to diagnose network issues
```

### Phase 6: Service Troubleshooting

#### Skills to Invoke
- `server-management` - Service management
- `systematic-debugging` - Debugging

#### Actions
1. Check service status
2. Review service logs
3. Test service restart
4. Verify dependencies
5. Check configuration

#### Commands
```bash
systemctl status service
journalctl -u service -f
systemctl restart service
```

#### Copy-Paste Prompts
```
Use @systematic-debugging to troubleshoot service issues
```

### Phase 7: Resolution

#### Skills to Invoke
- `incident-responder` - Incident response
- `bash-pro` - Fix implementation

#### Actions
1. Implement fix
2. Verify resolution
3. Monitor stability
4. Document solution
5. Create prevention plan

#### Copy-Paste Prompts
```
Use @incident-responder to implement resolution
```

## Troubleshooting Checklist

- [ ] System information gathered
- [ ] Resources analyzed
- [ ] Logs reviewed
- [ ] Network tested
- [ ] Services verified
- [ ] Issue resolved
- [ ] Documentation created

## Quality Gates

- [ ] Root cause identified
- [ ] Fix verified
- [ ] Monitoring in place
- [ ] Documentation complete

## Related Workflow Bundles

- `os-scripting` - OS scripting
- `bash-scripting` - Bash scripting
- `cloud-devops` - DevOps

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
