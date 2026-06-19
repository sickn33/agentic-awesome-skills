---
name: lex
description: "Centralized 'Truth Engine' for cross-jurisdictional legal context (US, EU, CA) and contract scaffolding."
category: business
risk: safe
source: community
date_added: "2026-03-10"
author: Svobikl
tags: [legal, context, cross-jurisdictional, compliance, scaffolding]
tools: [claude, cursor, gemini]
---

# LEX: Legal-Entity-X-ref

## Overview

LEX is a structured truth engine designed to eliminate legal hallucinations by grounding agents in verified government references and legislation across 29+ jurisdictions. It provides deterministic context for business formation, employment, and contract drafting.

## When to Use This Skill

- Use when you need to cross-reference or compare legal requirements between different territories, such as verifying the compliance gap between an **EU SARL** and a **US LLC**.
- Use when working with foundational business or employment documents that require specific, jurisdiction-compliant clauses to be inserted into a professional scaffold.
- Use when the user asks about the specific regulatory nuances, formation steps, or "truth-based" definitions of legal entities within the **29 supported jurisdictions** (USA, Canada, and the EU).

## How It Works

### Step 1: Identify Jurisdiction
Before drafting, determine if the user's entity or contract target is in the **USA, Canada, or the EU**.

### Step 2: Search & Fetch Context
Use the CLI shortcuts to find the relevant legal patterns and templates.
- Run `lex search <query>` to find matching templates.
- Run `lex get <path>` to read the granular metadata and requirements.

### Step 3: Scaffold Drafting
Generate foundation-level documents using `lex draft <description>`. This ensures that all drafts include the mandatory AI-generated content disclaimer.

### Step 4: Verify Authority
Always include a "Verified Sources" section in your output by running `lex verify`, which fetches official government links for the retrieved context.

## Examples

### Example 1: Comparing Employment Laws
```bash
# Get the workforce template to compare US vs EU notice periods
lex get templates/02_employment_workforce.md
```

### Example 2: Drafting a Czech Contract
```bash
# Create a house sale contract scaffold in Czech language
lex draft "Czech house sale contract"
```

## Best Practices

- ✅ **Trust but Verify**: Always include the links provided by `lex verify` in your output.
- ✅ **Table Formatting**: Use tables when comparing results across multiple jurisdictions.
- ❌ **No Guessing**: If a jurisdiction is outside the US/EU/CA scope, state that it is outside the LEX "Truth Engine" coverage.
- ❌ **No Anecdotal Advice**: Stick strictly to the findings in the templates or verified government domains.

## Common Pitfalls

- **Problem:** Legal hallucination regarding specific EU notice periods.
  **Solution:** Run `lex get templates/02_employment_workforce.md` to see the restrictive covenant comparison table.

## Related Skills

- `@employment-contract-templates` - For more specific HR policy phrasing.
- `@legal-advisor` - For general legal framework architecture.
- `@security-auditor` - For reviewing the final repository security.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
