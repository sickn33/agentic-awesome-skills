# Mission Brief Template

Copy this before every multi-agent task. Fill it in, share with the orchestrator, wait for confirmation.

```
MISSION BRIEF
─────────────────────────────────────────
Goal: 
Total Agents: 
Quota Strategy: [ FLASH-ONLY | MIXED | SONNET-LEAD ]
Expected Token Cost: [ LOW | MEDIUM | HIGH ]

AGENTS:
[1] ID: agent-001
    Role: 
    Scope: 
    Model: [ Gemini Flash | Claude Sonnet ]
    Input: 
    Output: 
    Depends on: [ none | agent-XXX ]

[2] ID: agent-002
    Role: 
    Scope: 
    Model: 
    Input: 
    Output: 
    Depends on: 

─────────────────────────────────────────
EXCLUSIONS (files agents must not touch):
- node_modules/
- .next/
- dist/
- package-lock.json
- [add project-specific exclusions]

API CONTRACT (if agents share data):
  Endpoint: 
  Input shape:  { }
  Output shape: { }
─────────────────────────────────────────
```
