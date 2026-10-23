---
name: antigravity-agent-manager
description: "Configure and orchestrate parallel agents using the standalone Antigravity 2.0 Agent Manager and Antigravity IDE."
category: general
risk: critical
source: self
source_type: self
date_added: "2026-06-04"
author: community
tags: [agent-manager, orchestration, multi-agent, setup]
tools: [antigravity, gemini]
---

# Antigravity Agent Manager

## Overview

A playbook for orchestrating multi-agent systems using the standalone **Antigravity 2.0 Agent Manager** (white icon) in parallel with the **Antigravity IDE** (black icon).

Google introduced Antigravity 2.0 as a standalone app; the availability of an integrated Agent Manager/button depends on the installed IDE release. This skill outlines how to install, configure, and operate the two environments side-by-side to direct multiple AI agents on front-end and back-end projects simultaneously.

## When to Use This Skill

- Use when you need to coordinate multiple front-end, back-end, or QA agents working on the same codebase simultaneously.
- Use when setting up the dual-window workspace (Antigravity IDE + Antigravity 2.0 Agent Manager).
- Use to resolve conflicts or obsolete tutorial steps that mention the integrated "Open Agent Manager" button.

Version, app names/icons and installation layout are version-specific. Verify current official documentation and the installed client before recommending a second app; icon color or a missing button is not proof of a required migration. Folder prompts and file watchers are not access controls or locks. Prefer isolated agent worktrees and integrate reviewed changes sequentially; never stage unrelated work.

## How It Works

### Step 1: Parallel Installation

1. **Keep your current Antigravity IDE**: Do not uninstall the classic IDE (black icon).
2. **Download Antigravity 2.0**: Fetch the standalone Agent Manager application from the official Antigravity downloads page.
3. **Install**: Run the installer. Check the official installer/version behavior and preserve settings/projects before installing; do not assume side-by-side installation is guaranteed. You should now have both:
   - **Antigravity IDE** (Black Icon) — Your code editor and manual development workspace.
   - **Antigravity 2.0** (White Icon) — Your multi-agent orchestrator dashboard.

### Step 2: Dual-Workspace Setup

1. Open both the **Antigravity IDE** and **Antigravity 2.0** applications.
2. Load the same project directory (e.g., `C:/Users/erwinpzocikk/Dev/GroupProjects/intIntercatedraAdmin`) in both apps.
3. In the Agent Manager (white icon), configure your Agent pool. Assign specialized roles (e.g., `frontend-agent`, `backend-agent`, `qa-validator`).

### Step 3: Coordinating Agent Execution

1. In the Agent Manager, define the task scopes. To prevent directory conflicts and race conditions:
   - Assign the `backend-agent` to the server directory (e.g., `/server` or `/api`).
   - Assign the `frontend-agent` to the frontend directory (e.g., `/client` or `/src`).
2. Run the agents in parallel.
3. Use the Antigravity IDE (black icon) to monitor file changes in real-time, review diffs, and perform manual tweaks.

## Examples

### Example 1: Defining Independent Scopes in Multi-Agent Projects

When configuring the Agent Manager dashboard, specify the target files or directories in the prompts to keep agents from colliding:

**Backend Agent Task Prompt:**
```text
Role: Backend Developer Agent
Workspace Target: /server
Task: Add a new POST /api/v1/students endpoint in server/routes/students.js and update server/database/models/student.js. Do not edit files outside the /server directory.
```

**Frontend Agent Task Prompt:**
```text
Role: Frontend UI Agent
Workspace Target: /client
Task: Build the student registration form under client/components/StudentForm.jsx. Consume the /api/v1/students endpoint. Do not edit files outside the /client directory.
```

### Example 2: Synchronizing Changes via Git

Since agents write code in parallel, sync their work using git in your IDE terminal:

```bash
# In the Antigravity IDE terminal, check the changes written by the agents
git status

# Review diffs before committing
git diff

# Commit stable checkpoints so both agents stay in sync with main branch
git add -- server/routes/students.js client/components/StudentForm.jsx
git commit -m "feat: synchronize parallel front-end and back-end agent changes"
```

## Best Practices

- ✅ **Do:** Run both applications simultaneously side-by-side.
- ✅ **Do:** Enforce strict folder-level boundaries (scopes) for each agent in the Agent Manager.
- ✅ **Do:** Use git branches or commits to checkpoint progress before letting agents perform massive rewrites.
- ❌ **Don't:** Let multiple agents edit the same file at the same time, as it causes write conflicts and git merge conflicts.
- ✅ **Do:** Check the installed surface/version and [official setup guidance](https://www.antigravity.google/docs) rather than assuming an integrated button exists or was removed.

## Limitations

- This skill assumes you have local administrator permissions to install both applications on Windows/macOS.
- File-system watchers report changes; they do not coordinate safe file locks between agents. If changes do not reflect, reload the IDE workspace (`Ctrl+R` or developer reload).

## Common Pitfalls

- **Problem:** Agents overwrite each other's code or get stuck in write locks.
  **Solution:** Isolate their workspaces. If they must edit the same file, orchestrate them sequentially (e.g., run the backend agent first, commit its changes, then run the frontend agent).
- **Problem:** Agent Manager changes are not visible in the IDE.
  **Solution:** Verify that both applications are pointing to the exact same absolute file path. On Windows, watch out for mapped drives or symlinks.

## Related Skills

- `@antigravity-workflows` - To guide the agent through sequential multi-agent execution.
- `@antigravity-skill-orchestrator` - For task complexity assessment and general skill routing.
- `@gitops-workflow` - To coordinate commits and branch merges in team environments.