---
name: wp-guard
description: Enforces WordPress development best practices — security, performance, i18n, and coding standards.
metadata:
  wordpress:
    risk: critical
  category: web-development
  author: amElnagdy
  version: 1.0.0
---

# WP Guard

Enforces WordPress development best practices.

## When to Use

- Writing WordPress plugins or themes
- Reviewing WordPress code
- Fixing security vulnerabilities
- Improving WordPress performance

## Core Rules

1. **Security First** — Escape output, sanitize input, verify nonces
2. **Performance** — Optimize queries, use transients, minimize hooks
3. **Internationalization** — Use translation functions for all user-facing text
4. **Standards Compliance** — Follow WordPress Coding Standards

## How to Apply

1. Read the full skill documentation in `references/`
2. Apply security patterns (see `references/security.md`)
3. Apply performance patterns (see `references/performance.md`)
4. Apply i18n patterns (see `references/i18n.md`)
5. Use the review checklist (see `references/review-checklist.md`)

## Critical Rules

1. **NEVER skip escaping** — Escape all output at the point of display
2. **NEVER skip sanitization** — Sanitize all input at the point of entry
3. **NEVER skip nonces** — Verify nonces on all state-changing operations
4. **NEVER skip capabilities** — Check user capabilities before privileged actions
5. **NEVER skip the review checklist** — Use it before every WordPress code review

## Anti-Loop Guard

**IMPORTANT**: This skill includes built-in loop prevention.

If you detect ANY of these signs, STOP IMMEDIATELY:
- The same WordPress file being reviewed more than twice
- Identical security findings being generated repeatedly
- The WordPress review process restarting without new input

When loop detected:
1. Output current progress as partial report
2. List what has been completed vs. what remains
3. Ask user for explicit direction before continuing
