# Subagent Orchestrator — Antigravity 2.0 Skill

A quota-aware, parallel subagent coordination skill for Antigravity 2.0.

Turns one big task into a set of isolated, efficient agent missions — without burning your weekly quota in 30 minutes.

---

## What it does

- Splits complex tasks into isolated agent missions before any code is written
- Routes tasks to the cheapest model that can handle them (Flash by default)
- Runs independent agents in parallel, not in sequence
- Monitors quota usage throughout and pauses if limits are approaching
- Recovers from agent failures without re-running the whole mission
- Runs a final integration check before declaring the mission complete

---

## Install

**One command (Windows PowerShell):**
```powershell
node scripts/install.js
```

**Manual install — copy this folder to:**
```
Windows: %USERPROFILE%\.agents\skills\subagent-orchestrator\
Mac/Linux: ~/.agents/skills/subagent-orchestrator/
```

Then restart your Antigravity session.

---

## Usage

The skill auto-activates when your task:
- Spans 3+ files or components
- Needs parallel agents (UI + API, planner + builder, etc.)
- Has quota risk (large codebase, many tool calls expected)

Or trigger it manually:
```
"Use subagent-orchestrator to build the auth flow"
```

---

## Folder structure

```
subagent-orchestrator/
├── SKILL.md                          ← Main skill (auto-loaded by Antigravity)
├── scripts/
│   └── install.js                    ← Installer script
├── examples/
│   ├── nextjs-feature.md             ← 3-agent parallel Next.js feature
│   ├── api-plus-frontend.md          ← Backend + frontend parallel build
│   └── debug-mission.md              ← Minimal quota repair mission
└── resources/
    ├── mission-brief-template.md     ← Copy-paste template for any mission
    └── quota-reference.md            ← Cost estimates for every action type
```

---

## Quota reference (quick)

| Model | Cost |
|-------|------|
| Gemini Flash | 1x (default for all subagents) |
| Claude Sonnet | ~4x (max 1 per mission) |
| Claude Opus | Never use in subagents |

| Mission size | Est. sprint used |
|-------------|-----------------|
| 1-file repair | < 5% |
| Single feature | 15–25% |
| Full flow (auth, API, UI) | 30–45% |

---

## Contributing

This skill was built to fill a real gap — the community's existing subagent skills had no quota management, no parallel coordination, and no error recovery.

PRs welcome. Follow the SKILL.md format from the Antigravity docs.
Submit to: https://github.com/sickn33/agentic-awesome-skills

---

## Compatibility

- Antigravity 2.0+ (CLI and IDE)
- Claude Code
- Cursor (via SKILL.md standard)
- OpenCode
