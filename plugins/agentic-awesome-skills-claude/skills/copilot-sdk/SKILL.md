---
name: copilot-sdk
description: "Build applications that programmatically interact with GitHub Copilot. The SDK wraps the Copilot CLI via JSON-RPC, providing session management, custom tools, hooks, MCP server integration, and streaming across Node.js, Python, Go, and .NET."
risk: critical
source: community
date_added: "2026-02-27"
---

# GitHub Copilot SDK

Build applications that programmatically interact with GitHub Copilot. The SDK wraps the Copilot CLI via JSON-RPC, providing session management, custom tools, hooks, MCP server integration, and streaming across Node.js, Python, Go, and .NET.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Prerequisites

- **GitHub Copilot CLI** installed and authenticated (`copilot --version` to verify)
- **GitHub Copilot subscription** (Individual, Business, or Enterprise) — not required for BYOK
- **Runtime:** Node.js 18+ / Python 3.8+ / Go 1.21+ / .NET 8.0+

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
