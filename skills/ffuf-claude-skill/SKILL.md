---
id: 'ffuf-claude-skill'
name: ffuf-claude-skill
description: "Web fuzzing with ffuf"
risk: safe
source: "https://github.com/jthack/ffuf_claude_skill"
date_added: "2026-02-27"
category: security-offensive
tags:
- ci
- claude
- hack
- orm
- test
- ui
tools:
- claude-code
author: 'emanueleodierna'
---

# Ffuf Claude Skill

## Overview

Web fuzzing with ffuf

## When to Use This Skill

Use this skill when you need to work with web fuzzing with ffuf.

## Instructions

This skill provides guidance and patterns for web fuzzing with ffuf.

For more information, see the [source repository](https://github.com/jthack/ffuf_claude_skill).

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Examples

### Example 1: Audit a Node.js API for OWASP Top 10 vulnerabilities

Review the Express routes in `src/routes/` for injection, broken auth, and insecure deserialization issues.

### Example 2: Threat model a new microservice

Apply STRIDE to the payment service: identify spoofing risks on the JWT endpoint and tampering risks on the webhook handler.

