---
name: antigravity-agent-manager
description: "Configure and orchestrate parallel agents using the standalone Antigravity 2.0 Agent Manager and Antigravity IDE."
category: general
risk: safe
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

Starting with version 2.0, Google decoupled the Agent Manager from the main IDE interface, removing the "Open Agent Manager" button. This skill outlines how to install, configure, and operate the two environments side-by-side to direct multiple AI agents on front-end and back-end projects simultaneously.

## When to Use This Skill

- Use when you need to coordinate multiple front-end, back-end, or QA agents working on the same codebase simultaneously.
- Use when setting up the dual-window workspace (Antigravity IDE + Antigravity 2.0 Agent Manager).
- Use to resolve conflicts or obsolete tutorial steps that mention the integrated "Open Agent Manager" button.

## How It Works

### Step 1: Parallel Installation

1. **Keep your current Antigravity IDE**: Do not uninstall the classic IDE (black icon).
2. **Download Antigravity 2.0**: Fetch the standalone Agent Manager application from the official Antigravity downloads page.
3. **Install**: Run the installer. It will install alongside your existing IDE without overwriting it. You should now have both:
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