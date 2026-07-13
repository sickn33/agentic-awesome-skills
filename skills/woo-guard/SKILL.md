---
name: woo-guard
description: Enforces WooCommerce development best practices — HPOS compatibility, CRUD patterns, checkout security, and performance.
risk: safe
source: https://github.com/amElnagdy/guard-skills
  woocommerce:
  category: web-development
  author: amElnagdy
  version: 1.0.0
------

# Woo Guard

Enforces WooCommerce development best practices.

## When to Use

- Writing WooCommerce plugins or themes
- Reviewing WooCommerce code
- Fixing HPOS compatibility issues
- Improving WooCommerce performance

## Core Rules

1. **HPOS Compatibility** — Use CRUD API, not post meta
2. **Security** — Escape output, sanitize input, verify nonces
3. **Performance** — Optimize queries, use transients, minimize hooks
4. **Standards Compliance** — Follow WooCommerce Coding Standards

## How to Apply

1. Read the full skill documentation in `references/`
2. Apply HPOS patterns (see `references/hpos-and-crud.md`)
3. Apply checkout patterns (see `references/checkout-and-money.md`)
4. Use the review checklist (see `references/review-checklist.md`)

## Critical Rules

1. **NEVER use post meta for orders** — Use CRUD API (`wc_get_order`, `wc_get_orders`)
2. **NEVER skip HPOS compatibility** — Declare compatibility with `FeaturesUtil`
3. **NEVER skip escaping** — Escape all output at the point of display
4. **NEVER skip sanitization** — Sanitize all input at the point of entry
5. **NEVER skip the review checklist** — Use it before every WooCommerce code review

## Anti-Loop Guard

**IMPORTANT**: This skill includes built-in loop prevention.

If you detect ANY of these signs, STOP IMMEDIATELY:
- The same WooCommerce file being reviewed more than twice
- Identical findings being generated repeatedly
- The WooCommerce review process restarting without new input

When loop detected:
1. Output current progress as partial report
2. List what has been completed vs. what remains
3. Ask user for explicit direction before continuing
